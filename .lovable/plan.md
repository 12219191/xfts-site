# Enviar leads dos formulários direto para o FLEXUS | CRM

Cada envio de formulário de **contato** e **demo** passa a criar (ou atualizar) automaticamente um lead no CRM, com toda a origem do clique junto: página, botão, tipo de clique, campanha e UTMs de first-touch e last-touch.

Pedidos de exclusão de dados continuam fora — são solicitações de privacidade, não leads.

## Como vai funcionar

1. O visitante envia o formulário no site.
2. O nosso servidor grava o protocolo (como já faz hoje) e dispara o Zapier.
3. Em seguida envia o lead para o CRM por um canal assinado e privado entre os dois sistemas.
4. O CRM procura um lead com o mesmo **e-mail ou telefone**:
   - encontrou: atualiza os dados que estiverem vazios, registra a nova interação e atualiza a origem mais recente;
   - não encontrou: cria um lead novo com origem "Site XFTS".
5. O resultado (criado / atualizado / falhou) fica gravado no protocolo e visível na aba Formulários do /admin.

Se o CRM estiver fora do ar, o envio ao cliente não quebra: o protocolo é salvo como pendente e reenviado automaticamente.

## O que o cliente vê

Nada muda no formulário: mesma mensagem de confirmação e mesmo protocolo.

## O que muda no /admin

- Nova coluna/etiqueta "CRM" em cada protocolo: **Criado**, **Atualizado**, **Pendente** ou **Falhou** (com o motivo).
- Botão "Reenviar ao CRM" nos protocolos com falha.
- Indicador no topo com quantos leads foram para o CRM no período filtrado.

## Detalhes técnicos

**No hub (este site)**

- `src/lib/crm-lead.server.ts` — monta o payload do lead e faz o POST assinado (HMAC-SHA256 com `FLEXUS_APP_KEY_CRM`, header `x-flexus-signature`), reaproveitando `signBody` de `src/lib/sso.server.ts`. Timeout de 10s e nunca lança exceção, no mesmo padrão de `provisioning.server.ts`.
- `src/lib/zapier.functions.ts` — depois de gravar em `form_submissions`, chama o envio ao CRM quando `form_type` for `contato` ou `demo`, e grava o resultado no protocolo.
- Migração em `public.form_submissions`: colunas `crm_status` (`pending` | `created` | `updated` | `failed` | `skipped`), `crm_lead_id`, `crm_error`, `crm_synced_at`. Sem novos GRANTs para visitantes — a tabela continua com escrita apenas pelo servidor.
- `src/lib/crm-lead.functions.ts` — server function protegida por `requireSupabaseAuth` + verificação de admin para reenvio manual a partir do /admin.
- Rota `src/routes/api/public/crm-retry.ts` para reprocessar pendentes, protegida por segredo, chamada por `pg_cron` a cada 15 minutos.
- `src/components/admin/FormSubmissionsPanel.tsx` — etiqueta de status do CRM, filtro por status e botão de reenvio.
- Endpoint do CRM registrado em `src/lib/flexus-apps.ts` (`leadUrl`), apontando para a função de backend do projeto CRM.

**Payload enviado ao CRM**

```text
reference_id, form_type, nome, email, telefone, empresa, segmento,
assunto, mensagem, origem: "site-xfts",
cta_id, cta_label, cta_page, cta_placement, tela,
utm_source/medium/campaign/term/content, gclid, fbclid, referrer, landing_page,
lt_* (last-touch equivalentes), timestamp
```

**No projeto FLEXUS | CRM (implementação do outro lado)**

Precisa de uma função `flexus-lead` que valide a assinatura HMAC com `FLEXUS_APP_KEY_CRM`, faça o upsert por e-mail ou telefone, registre a interação e devolva `{ lead_id, action: "created" | "updated" }`. A especificação completa entra em `docs/integracao-hub/crm.md` para ser implementada no projeto do CRM — enquanto ela não existir, os protocolos ficam como "Pendente" e são reenviados sozinhos quando o endpoint entrar no ar.
