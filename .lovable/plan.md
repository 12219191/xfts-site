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
