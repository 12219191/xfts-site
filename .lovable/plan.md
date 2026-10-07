# Unificar as contas do Luciano no Hub (A → B)

Fases 1 e 2 foram feitas só com leitura. Nada foi alterado.

## Fase 1: Inventário (consultas feitas em 07/10/2026)

| | Conta A (vai ser desativada) | Conta B (principal) |
|---|---|---|
| E-mail | luciano.bruttin@gmail.com | lbruttin@xfts.com.br |
| hub_user_id | 2f04e8f3-bf7d-4d18-aa2a-2179d7dccce0 | f654ced0-9e06-4b2e-8f06-a72d806e7df5 |
| Criada em | 06/07/2026 | 10/04/2026 |
| Último login | 07/10/2026 20:30 UTC | 07/10/2026 21:14 UTC |
| Papel no Control Center | nenhum | 1 (admin_roles) |
| Assinaturas | 2 | 6 |
| Convites de equipe (como dono) | 2 | 2 |
| Tokens de SSO emitidos | 2 | 7 |
| Eventos de assinatura | 2 | 5 |
| Reembolsos, cobrança em atraso, notas, fila de provisionamento, sessões de suporte | 0 | 0 |

**Assinaturas da conta A** (consulta em `subscriptions`): as duas são **cortesias live** (`is_courtesy=true`). Nenhuma está ligada a um cliente real do Stripe (o `stripe_customer_id` não começa com `cus_`).
- CRM: `flexus_crm_pro_mensal`, active, de 27/08/2026 a 27/08/2027, credit_anchor 27/08/2026.
- Casa360: `flexus_casa360_pro_mensal`, active, mesmas datas.

**Assinaturas da conta B:**
- Barbearia live, cortesia Pro, active até 27/08/2027.
- Atende live: cortesia Corporate active até 04/11/2026, e uma cortesia Basic já cancelada.
- Três assinaturas **sandbox de teste**, já vencidas em 16/09/2026: CRM, Casa360 e Barbearia (`test_sub…`).

**Convites:**
- A é dona de 2 convites aceitos por isabela.fernanda.buosi@gmail.com: um no CRM e um no Casa360, os dois live.
- B é dona de 2 convites aceitos na Barbearia.

**Histórico de cobrança no Stripe:** não existe para a conta A, porque as duas assinaturas são cortesias. Por isso, mover as assinaturas não mexe em nada no Stripe.

**Chaves de API e webhooks:** são por sistema (`FLEXUS_APP_KEY_*` em `src/lib/sso.server.ts:87-96`), não por usuário. A unificação não afeta nenhuma delas.

**Entitlements e capabilities:** são calculados no momento da consulta, a partir do `price_id` e do status da assinatura (`src/routes/api/public/sso/verify.ts:181-201`). Não há nada salvo por usuário. Quando a assinatura passar para B, os recursos vão junto.

### SSO: o que cada sistema recebe
- `src/lib/sso.functions.ts:96-108` monta o token com `sub` = hub_user_id, o e-mail da sessão, o app, o plano, `role: "owner"` e os assentos.
- `sso/verify.ts:211-226` devolve aos sistemas `user_id` (o hub_user_id), `email`, `plano`, `limite_usuarios` e `ativo`.
- **O tenant é o próprio hub_user_id.** O Hub não tem uma tabela de empresas ou organizações separada.
- **Casa360 se liga ao usuário por e-mail e grava o hub_user_id** (`docs/integracao-hub/casa360.md:89-105`): procura o usuário local pelo e-mail e faz upsert em `hub_accounts` com `onConflict: "hub_user_id"`.
- **CRM faz o mesmo:** procura o usuário existente pelo e-mail e grava o hub_user_id (`docs/integracao-hub/crm.md:16`).
- **Risco:** depois da troca, o Casa360 e o CRM receberiam um hub_user_id e um e-mail novos. Os dois criariam (ou ligariam) **outro** usuário local. Os dados atuais continuariam presos ao usuário local do gmail. Isso vem dos documentos de integração. O código real desses sistemas está **não verificado**.

### Aliases, transferência e fusão de contas
O Hub **não tem** nenhum desses recursos. Busquei por alias/merge/transfer em `src/lib` e só apareceu a transferência de lookup key de preço do Stripe, que não tem relação com contas. Para fazer a unificação, precisamos de:
- um script SQL feito uma única vez, numa transação;
- uma ação parecida em cada sistema afetado (CRM e Casa360).

## Fase 2: Plano (aguardando o seu "aprovado")

### Ordem, numa janela combinada com o CRM e o Casa360
1. **Backup** (num schema `backup_merge_20261007`): cópias das linhas afetadas de `subscriptions`, `account_invites`, `subscription_events` e `sso_tokens` das duas contas. Antes e depois de cada etapa, conto as linhas.
2. **Sistemas: preparar sem ligar ainda.** O CRM e o Casa360 deixam pronto um script que, no registro do usuário em `hub_accounts` (hoje com hub_user_id A):
   - troca `hub_user_id` para B e `email` para lbruttin@xfts.com.br;
   - **mantém o mesmo usuário local**, para não perder nenhum dado.
   Os sistemas também precisam confirmar que não existe, para o lbruttin, outro usuário local já criado pelas assinaturas sandbox de teste. Isso está não verificado. Se existir, ele deve ser desativado, nunca apagado.
3. **Bloquear acesso pela conta A:** invalidar os tokens de SSO ainda não usados da conta A (marcar como usados). Só faço isso depois de conferir que nenhum está em aberto.
4. **Hub, numa transação única:**
   - passar as 2 cortesias de CRM e Casa360 para B, trocando só o dono. O id, o preço, as datas, o credit_anchor e o status ficam iguais;
   - passar os 2 convites da Isabela e os 2 eventos de assinatura para B;
   - registrar tudo em `admin_audit_log`, com os valores de antes e depois e o motivo "unificação de contas".
5. **Sistemas rodam a troca preparada no passo 2,** logo em seguida e na mesma janela.
6. **Conferir com a conta B:**
   - em "Minha conta" aparecem os 4 sistemas;
   - o SSO entra no CRM e no Casa360 com os dados de antes;
   - a Isabela continua com acesso;
   - os entitlements de CRM e Casa360 respondem `ativo: true`.
7. **Desativar a conta A**, só depois da conferência: bloquear o login dela (ban) no sistema de login. A conta não é apagada.

### Observações
- As assinaturas sandbox de teste da conta B (CRM e Casa360, vencidas) continuam onde estão. A escolha da assinatura no SSO pega a mais recente do sistema (`sso/verify.ts:189`). A cortesia live (27/08) é mais recente que a de teste (17/08), então ela prevalece. Se você preferir, posso cancelar as de teste depois, num passo separado.
- Barbearia e Atende não mudam nada: continuam com a conta B.

### Como reverter cada passo
- **Passo 4:** restaurar `user_id`/`owner_user_id` a partir do backup, numa transação inversa, também registrada em `admin_audit_log`.
- **Passos 2 e 5:** os sistemas voltam `hub_user_id` e `email` para os valores de A.
- **Passo 3:** tokens de SSO vencem em 2 minutos. Não precisa reverter, basta gerar um link novo.
- **Passo 7:** tirar o bloqueio da conta A.

## Fase 3: Execução (só depois do "aprovado" e da janela combinada)
Executo os passos 1, 3, 4 e 7 no Hub, com contagens antes e depois de cada um. Os passos 2 e 5 ficam com as equipes do CRM e do Casa360. Entrego para elas o script pronto, com os dois IDs.
