# Sessão de Suporte XFTS com identidade própria

Substitui o "Acesso de suporte" atual, que entra como o cliente com papel `owner`, por uma sessão em que o atendente aparece como ele mesmo, com papel interno, prazo e auditoria.

## Fluxo

```text
Control Center ──(papel + motivo + ticket)──> Hub emite token (5 min, uso único, chave dedicada)
      │                                              │ jti gravado
      ▼                                              ▼
Abre https://<produto>/support?token=...  ──>  produto chama POST /api/public/support-session/verify
                                                   │ (chave do app + token)
                                                   ▼
                                     Hub valida, consome o jti, abre a sessão (máx. 60 min)
                                     e devolve ator, papel, tenant e capabilities XFTS
```

## Situação atual (verificado)
- O acesso de suporte (`createSupportAccess` em `admin-customers.server.ts`) assina um token SSO com `role: "owner"` e `purpose: "support"`, usando a mesma chave do SSO. O Atende já é recusado.
- Hoje `capability-check` recusa `XFTS_SUPPORT`/`XFTS_SUPERADMIN`/`SYSTEM` em `acting_as` com 403 (`parseActingAs`). Essa regra continua.
- `scopeAllows` em `src/lib/capabilities.ts` já tem os escopos `XFTS_SUPPORT` e `XFTS_SUPERADMIN`, mas ninguém os ativa (`isXftsSupport`/`isXftsSuperadmin` são sempre `false`).
- O Relatório Dados 360 aparece duas vezes no catálogo de capabilities:
  - **Estética:** `reports.dados_360` ("Dados Gerenciais 360"), escopo `XFTS_SUPPORT`, ou seja, já é exclusivo da XFTS.
  - **Barbearia:** `reports.data_360` ("Relatório · Dados 360"), escopo `TENANT_ADMIN`, ou seja, hoje é liberado ao admin do cliente.

  Preciso que você decida se o da Barbearia também deve virar exclusivo da XFTS (veja "Decisão pendente"). A Barbearia ainda tem 14 capabilities `XFTS_SUPERADMIN`, por exemplo `xfts.*`, `admin.backup` e `admin.security`.

## O que muda no Hub

### Banco (migração)
- Nova tabela `support_sessions`, com:
  - identificação: `id`, `jti` (único), `actor_id`, `actor_email`, `actor_name`, `role` (`XFTS_SUPPORT` | `XFTS_SUPERADMIN`), `tenant_id`, `app_key`, `reason`, `ticket`, `environment`;
  - datas: `token_expires_at`, `used_at`, `session_expires_at`, `ended_at`;
  - encerramento: `ended_reason` (`ended` | `revoked` | `expired`), `revoked_by`.
- Grants apenas para `service_role` e RLS sem políticas públicas. A tabela só é lida e escrita pelo servidor, depois da checagem de papel admin.
- O consumo é atômico: um `UPDATE ... WHERE jti = ? AND used_at IS NULL AND token_expires_at > now()` roda num único passo, para que dois usos simultâneos não passem.

### Segredo
- Novo `XFTS_SUPPORT_SESSION_SECRET` (64+ chars), gerado aleatoriamente. Não reaproveita a chave do SSO nem as chaves de provisionamento.

### Arquivos
- `src/lib/support-session.ts` (novo, puro e testável):
  - tipos e o enum de papéis;
  - `isWriteAllowed(role)`: só `XFTS_SUPERADMIN` escreve;
  - limites de 5 min para o token e 60 min para a sessão;
  - validação de claims.
- `src/lib/support-session.server.ts` (novo):
  - `issueSupportToken`: JWT HS256 com `actor_id`, `actor_email`, `role`, `tenant_id`, `app_key`, `reason`, `ticket`, `jti`, `iat`, `exp` e `aud=app_key`;
  - `verifyAndConsume`: confere assinatura, expiração e `aud`, e consome o jti;
  - `checkSession`, `endSession`, `revokeSession`.
- `src/lib/support-session.functions.ts` (novo): server functions do Control Center protegidas por `requireAdminModule("clientes")`.
  - Abrir com `XFTS_SUPERADMIN` exige que o admin tenha o papel `superadmin` no Hub.
  - O módulo também traz a lista de sessões ativas e a revogação.
- `src/routes/api/public/support-session/verify.ts` (novo, POST): o produto envia a chave do app e o token.
  - Em caso de sucesso, devolve `session_id`, `actor` (`id`, `email`, `display_name: "Nome (XFTS Suporte)"`), `role`, `tenant_id`, `session_expires_at`, `can_write`, `capabilities` e `entitlements`.
  - Erros: 401 para assinatura inválida, expirado ou reuso; 403 para app diferente do token ou tenant sem assinatura.
- `src/routes/api/public/support-session/status.ts` (novo, POST): o produto revalida a sessão periodicamente, recebendo se está ativa ou revogada.
- `src/routes/api/public/support-session/end.ts` (novo, POST): o produto avisa que o usuário clicou em Encerrar.
- `src/routes/api/public/support-session/audit.ts` (novo, POST): o produto registra cada escrita do superadmin. Uma escrita com sessão `XFTS_SUPPORT` é recusada com 403 e a tentativa fica registrada.
- `src/routes/api/public/capability-check.ts`: aceita, opcionalmente, `support_session_id`.
  - Com sessão válida, o viewer vem do Hub (`isXftsSupport`/`isXftsSuperadmin`), nunca do `acting_as`.
  - `acting_as` interno sem sessão continua dando 403.
- `src/routes/api/public/entitlements.ts`: com `support_session_id` válido, inclui as capabilities XFTS. Sem ele, a resposta não muda.
- `src/lib/capability-check.ts`: novo `supportViewer(session)`. `parseActingAs` fica igual.
- `src/lib/admin-customers.server.ts` / `.functions.ts`: `createSupportAccess` passa a emitir a sessão nova. O fluxo antigo com `role: "owner"` sai.
- `src/routes/api/public/sso/verify.ts`: recusa tokens `purpose: "support"` ainda pendentes. Não haverá sessão de suporte disfarçada de owner.
- `src/components/admin/CustomerTimelineDialog.tsx` (ou o diálogo de suporte atual em `/admin/clientes`):
  - escolha do papel, motivo (mínimo de 5 caracteres) e ticket;
  - o link abre numa nova aba.
- `src/components/admin/SupportSessionsPanel.tsx` (novo), em `/admin/clientes`: sessões ativas com ator, tenant, sistema, papel, tempo restante e botão Revogar.
- Auditoria (`admin_audit_log`): `support_session.issued`, `.used`, `.write`, `.write_denied`, `.ended`, `.revoked` e `.expired` (este quando a revalidação detecta).
- Documentação: `docs/integracao-hub/support-session.md`, com o contrato e um exemplo para os produtos. Também uma regra no `AGENTS.md`: "papel interno só via sessão de suporte assinada pelo Hub".

### Testes (vitest)
- Token expirado gera 401.
- Token reutilizado: o segundo verify gera 401.
- Assinatura inválida ou token assinado com a chave do SSO gera 401.
- Token de um app usado em outro gera 403.
- `acting_as: XFTS_SUPPORT`/`XFTS_SUPERADMIN` sem sessão no capability-check continua 403.
- Sessão `XFTS_SUPPORT` tentando escrever (audit write) gera 403. `XFTS_SUPERADMIN` passa.
- Liberação do Dados 360 da Estética:
  - `XFTS_SUPPORT` e `XFTS_SUPERADMIN` liberados;
  - `TENANT_ADMIN` bloqueado.
- Sessão revogada ou com mais de 60 min retorna `active=false`.
- Os 110 testes atuais seguem verdes.

## O que cada produto precisa implementar

Isso vale para Atende, Estética, Barbearia, CRM e Casa360. O Hub não altera os outros sistemas. Entrego um kit pronto para colar, como fiz com o capability-gate.

1. **Rota `/support?token=...`**:
   - chama `POST https://xfts-flexus.com/api/public/support-session/verify` com `x-flexus-app-key`;
   - se a resposta não for ok, mostra "Acesso de suporte inválido ou expirado".
2. **Sessão local separada da do cliente**:
   - não cria nem reutiliza um usuário do tenant;
   - expira em `session_expires_at` (máx. 60 min);
   - guarda `session_id`, `role` e `tenant_id`.
3. **Identidade**: mostra `actor.display_name`, "Nome (XFTS Suporte)", em todo lugar onde aparece o usuário logado. Logs internos do produto também usam o ator XFTS.
4. **Faixa fixa** "Sessão de suporte XFTS · <papel> · expira em mm:ss", com botão **Encerrar**. Encerrar chama `/end` e apaga a sessão local.
5. **Revalidação** a cada 60 s (e antes de cada escrita) via `/status`. Se a sessão estiver revogada ou expirada, o produto encerra na hora.
6. **Capabilities**:
   - envia `support_session_id` no capability-check, em vez de `acting_as` interno;
   - usa as capabilities devolvidas pelo verify para mostrar as telas XFTS (ex.: Dados 360).
7. **Escrita**:
   - `XFTS_SUPPORT` é somente leitura, então o produto bloqueia no backend dele;
   - `XFTS_SUPERADMIN` registra cada escrita via `/audit` antes de concluir. Se o Hub recusar, a escrita é cancelada.
8. **Atende:** continua com SSO só para owner, regra que não muda. A sessão de suporte é um fluxo separado e passa a ser possível nele, porque não usa mais o papel de owner.

## Fora do escopo
- Não altero assinaturas, pagamentos, preços nem o SSO de clientes, e não publico.
- Não altero o código dos produtos externos: entrego só o kit.

## Decisão pendente
Barbearia `reports.data_360` está como `TENANT_ADMIN`. Se ele deve ficar só para a XFTS, mudo o escopo para `XFTS_SUPPORT`, com auditoria. Isso tira o relatório dos admins de barbearias que o usam hoje. Sem a sua confirmação, ele fica como está.
