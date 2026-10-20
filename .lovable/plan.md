# FLEXUS | Flow no Hub

## Passo 1 — Diagnóstico (já feito, sem alterar nada)

| Tema | Como funciona hoje |
|---|---|
| Catálogo | Banco: `catalog_products` (status `active/development/beta/paused/discontinued`, `show_on_website`, `available_for_purchase`, textos, imagem) e `catalog_plans` (preço mensal/anual em centavos, `price_lookup_key`, `annual_lookup_key`, `seats`, `entitlements` JSON, `trial_days`). Código: `src/lib/flexus-apps.ts` (URL do app, provision URL, prefixo de preço), `src/lib/product-plans.ts` (reserva), `src/lib/catalog.ts` (tiers válidos por produto). Editável em /admin (Catálogo). |
| Checkout | `createCheckoutSession` em `src/lib/checkout.functions.ts`: exige login, bloqueia produto não contratável e compra duplicada, reaproveita cliente Stripe, Embedded Checkout, `allow_promotion_codes`, trial só na 1ª contratação (de `catalog_plans.trial_days`), metadados `userId/appKey/lookupKey`. Volta para URL validada por allowlist; `getCheckoutStatus` confirma. |
| Trial e renovação | Trial do próprio Stripe (`trial_period_days`). Upgrade pró-rata imediato, downgrade agendado (subscription schedule), cancelamento no fim do período, falha → `dunning_state` com carência. Em `src/lib/subscriptions.functions.ts` e `dunning.server.ts`. |
| Webhook | `/api/public/payments/webhook?env=` → `src/lib/payments-webhook.server.ts`. Assinatura HMAC verificada; eventos: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_failed, invoice.paid/payment_succeeded. Grava `subscriptions`, `subscription_events`, `webhook_events`, `provision_queue`, `dunning_state`. |
| Liberação de acesso | Hub envia webhook de provisionamento assinado (fila `provision_queue`) para a URL do produto, e o produto consulta `GET /api/public/entitlements` com `x-flexus-app-key` (secrets `FLEXUS_APP_KEY_<APP>`). Devolve plano, status, período e limites do plano. |
| Login único | Login só no Hub. "Acessar Sistema" chama `createSsoLink` → token de uso único → produto valida em `/api/public/sso/verify`. Barbearia xfts-flexus6, CRM flexus7, Casa360 flexus8, Estética flexus9, Atende flexus10. |
| Área do cliente | `/minha-conta`: faturas, troca de plano, cancelamento e portal do Stripe. |
| Identificadores | `user_id` do Hub (titular), `stripe_customer_id`, `stripe_subscription_id`; produtos guardam `hub_user_id` + e-mail no seu workspace. |
| Secrets (nomes) | `STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET`, `LOVABLE_API_KEY`, `FLEXUS_SSO_SECRET`, `FLEXUS_APP_KEY_*`. |

**Lacunas / riscos para o Flow**
1. Status: não precisa campo novo. "Em breve" = `status development` + `available_for_purchase=false`; "à venda" = `active` + `true`. Muda pelo admin, sem deploy.
2. Os ids pedidos (`flow_start`…) não seguem o padrão de prefixo; proponho prefixo `flexus_flow` com lookup keys `flexus_flow_start_mensal/anual` etc. (a chave `flow` e os nomes dos planos ficam iguais).
3. Tiers Start/Pro/Business não existem: precisam ser declarados como tiers próprios do Flow (regra: nunca converter silenciosamente). Hoje "business" seria lido como "Básico".
4. Limites novos (contatos ativos, canais, fluxos) entram como definições de recurso do produto `flow`; "usuários" usa `seats`.
5. Falta o projeto Flow: sem URL, sem provision URL e sem chave `FLEXUS_APP_KEY_FLOW` — SSO e provisionamento ficam desligados até existirem.

## Passo 2 — O que será feito

1. **Cadastro:** `flow` em `flexus-apps.ts` (URL vazia, sem provision), tiers start/pro/business, produto no catálogo como "Em breve", planos com R$ 89 / 249 / 549, anual com 20% (R$ 854 / 2.390 / 5.270), 7 dias de teste, limites guardados por plano; Enterprise "Falar com Consultor".
2. **Stripe (teste):** produtos e preços mensal + anual de Start, Pro e Business.
3. **Página `/produtos/flexus-flow`:** mesmo layout das outras, diferença Flow × Atende, segmentos, modelos prontos, explicação de "contato ativo", aviso de custos Meta/WABA, aviso de canais (TikTok "Em breve"), "Como funciona o pagamento", FAQ, link para comparação, SEO.
4. **Site:** card na Home e em Produtos, aba em Comparar Planos, opção "Automação de conversas (Flow)" nos formulários, menu/rodapé, sitemap, Termos e Privacidade (dados de contatos e conversas vindos da Meta).
5. **Acesso:** `flow` registrado em entitlements, provisionamento e SSO existentes, sem tocar nos outros produtos.
6. **Verificação:** compra de teste com status "à venda", conferir assinatura e entitlements, voltar a "Em breve"; confirmar que a página em "Em breve" não abre checkout; testes e checagem de tipos.

## Detalhes técnicos
- Tiers em `PRODUCT_PLAN_TIERS` (`src/lib/catalog.ts`); `planTierFromPriceId` ganha leitura de start/business só para o prefixo do Flow.
- Migração com INSERT em `catalog_products`, `catalog_plans`, `entitlement_definitions` (contacts_active, channels, flows_active).
- `LEAD_SEGMENTS` ganha `flow`; `FlexusAppKey` ganha `flow`.
- Nada é publicado sem sua autorização.

## Ajustes aprovados (20/10)
- Tudo em modo de teste; Flow fica "Em breve" (venda desligada).
- Recursos do `flow`, além de contacts_active, channels e flows_active: campaigns, ai_agents, export_csv (Pro e Business), public_api e outbound_webhooks (só Business). Start com todos desligados.
- Convenção documentada: valor nulo = ilimitado (canais do Business; fluxos do Pro e do Business).
- Prefixo `flexus_flow`; tiers start/pro/business declarados só para o Flow.
- Enterprise fora do Stripe.
- Registrar no roadmap: contrato técnico entregue; Enterprise manual depende de recurso novo (ver abaixo).

## Respostas (só leitura)

**Enterprise manual:** o admin já concede plano manual sem Stripe ("Cortesia", em /admin: assinatura com `is_courtesy`, plano escolhido, validade e número de usuários ajustável). Não existe recurso por cliente: os recursos vêm do plano do catálogo. Para Enterprise com recursos sob medida seria preciso criar um plano Enterprise do Flow só no catálogo (sem preço) ou um campo de recursos personalizados por assinatura — fora deste plano até você decidir.

**Contrato técnico Hub ↔ Produto**

(a) Provisionamento
- URL: `provisionUrl` do produto (padrão `https://<app>/api/provision`). POST, `Content-Type: application/json`, timeout 10 s.
- Cabeçalho `x-flexus-signature: base64url(HMAC-SHA256(FLEXUS_APP_KEY_<APP>, corpo cru))`. Não há cabeçalho de horário: o produto deve rejeitar `timestamp` do corpo com mais de 5 min e comparar em tempo constante.
- Eventos: `created`, `updated`, `canceled`, `payment_failed`. Corpo (exemplo `created`):
```text
{"event":"created","user_id":"<uuid>","produto":"flow","plano":"Pro",
 "limite_usuarios":10,"recursos":{"campaigns":true,...},
 "limites":{"contacts_active":2500,"channels":3,"flows_active":null},
 "price_id":"flexus_flow_pro_mensal","status":"trialing",
 "acesso_ate":"2026-11-20T00:00:00Z","environment":"sandbox",
 "timestamp":"2026-10-20T16:00:00.000Z"}
```
  `updated`/`payment_failed`: mesmo formato com status novo. `canceled`: `limite_usuarios:0`, `recursos:{}`, `limites:{}`.
- Resposta: qualquer 2xx com `Content-Type: application/json` (HTML conta como falha).
- Novas tentativas: fila com intervalos 1, 5, 15, 60 e 360 min; após 6 tentativas fica "falhou" no admin (reenvio manual).

(b) `GET /api/public/entitlements?app=flow&user_id=<uuid>` (opcional `support_session_id`), cabeçalho `x-flexus-app-key`. Resposta:
```text
{"ativo":true,"status":"trialing","plano":"Pro","papel":"owner",
 "limite_usuarios":10,"usuarios_em_uso":3,"recursos":{...},"limites":{...},
 "capabilities":[...],"acesso_ate":"...","cancelamento_agendado":false}
```
  Status: none, trialing, active, past_due, canceled, incomplete, unpaid. `ativo` = trialing/active/past_due ou canceled ainda no período. Hoje não há campos separados de fim do teste e início do período: só `acesso_ate` (fim do período atual, que no teste é o fim do teste). Erros: 400 app/user_id inválido, 401 chave.

(c) SSO
- "Acessar Sistema" → Hub confere assinatura ativa e cria token HS256 (`FLEXUS_SSO_SECRET`), uso único, 2 min, e manda para `https://<app>/sso?token=<jwt>`.
- O produto chama `POST /api/public/sso/verify` com `x-flexus-app-key` e `{"token":"..."}`.
- Devolve `user_id`, `email`, `produto`, `plano`, `papel` ("owner"), `limite_usuarios`, `recursos`, `limites`, `status`, `ativo`, `acesso_ate`, `cancelamento_agendado`. Não devolve nome nem "é admin XFTS": a equipe XFTS entra só pela Sessão de Suporte, que tem identidade própria.
- Erros: 400 corpo inválido; 401 chave/token inválido, expirado ou já usado; 403 sem assinatura ou tipo de acesso proibido; 409 assinatura ambígua (Atende).

(d) Usuários adicionais: o Hub só informa `limite_usuarios` e recebe `usuarios_em_uso`; o convite e o login das pessoas da equipe ficam no próprio produto. O SSO do Hub só funciona para o titular com assinatura; convidados sem assinatura não passam pelo Hub.

(e) Secrets do produto: `FLEXUS_APP_KEY_FLOW` (a mesma chave nos dois lados; serve para provisionamento, entitlements e SSO) e, se adotar suporte, `XFTS_SUPPORT_SESSION_SECRET`. No Hub, entra também a URL do app do Flow.

(f) Ambientes: cada assinatura tem `environment` (sandbox ou live) e o provisionamento envia esse campo; o produto deve separar ou ignorar sandbox. Não há URL ou chave separada por ambiente do lado do produto. O `?env=` existe só no webhook do Stripe → Hub.

(g) Passo a passo, produto novo sem URL:
1. Hub: produto no catálogo, preços no Stripe, chave `FLEXUS_APP_KEY_FLOW`.
2. Enquanto não há URL: compra funciona, assinatura é gravada, mas provisionamento fica "app indisponível" e "Acessar Sistema" não abre.
3. Produto publicado: preencher URL e provisionUrl, mesma chave nos dois lados.
4. Reenviar provisionamentos pendentes pelo admin.
5. Cliente clica "Acessar Sistema" → `/sso?token` → produto valida, cria workspace pelo `user_id` e passa a consultar entitlements.
