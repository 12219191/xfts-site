# Control Center — Fase 2: catálogo editável

Hoje o catálogo de produtos e planos vive no código (`flexus-apps.ts` e `product-plans.ts`) e `/admin/produtos` só exibe. Nesta fase o catálogo passa para o banco, fica editável no Control Center, e a criação de preços na Stripe é feita pelo próprio painel.

## 1. Catálogo no banco

Duas tabelas novas:

- **Produtos** — nome, chave do sistema (barbearia, crm, casa360, clínica, estética, ABA), domínio, rota da landing, prefixo de preço, disponível/em breve, ordem de exibição.
- **Planos** — produto, nome (Básico/Pro/Enterprise), descrição, tier, preço mensal, preço anual, lista de features, limite de usuários, rótulo do botão, lookup keys mensal e anual, ativo/inativo, ordem.

Os dados atuais entram como carga inicial, exatamente iguais aos de hoje, para nada mudar no site no dia da virada.

## 2. Tela de edição em /admin/produtos

- Lista de produtos com contagem de planos e status.
- Editor de produto: nome, domínio, landing, disponibilidade.
- Editor de plano: preço mensal e anual, descrição, features (lista com arrastar para reordenar), limite de usuários, tier, texto do botão, ativar/desativar.
- Pré-visualização do card do plano como aparece no site, ao lado do formulário.
- Toda alteração grava na auditoria (quem, quando, antes, depois) — inclusive mudança de preço.
- Acesso: Superadmin e Produto. Alterar preço exige confirmação com resumo do impacto.

## 3. Preços criados na Stripe pelo painel

Ao salvar um plano com preço novo:

1. O painel cria o preço na Stripe (produto criado na primeira vez), com o lookup key do plano.
2. O lookup key migra automaticamente do preço antigo para o novo — assinantes atuais continuam no preço antigo, novos checkouts usam o novo.
3. O preço antigo é arquivado, nunca apagado.
4. Falha na Stripe cancela o salvamento e mostra o motivo; o banco não fica dessincronizado.

Uma tela de "conferência" mostra, por plano, o valor no banco × o valor ativo na Stripe, com aviso quando divergirem e botão para reenviar.

## 4. Site lendo o catálogo do banco

As páginas de produto, a comparação de planos e o checkout passam a ler o catálogo do banco em vez do arquivo de código:

- Leitura pública, apenas de planos ativos, com cache — as páginas continuam renderizadas no servidor e rápidas.
- Comparação de planos e `/minha-conta` (opções de upgrade/downgrade) usam a mesma fonte.
- O checkout continua validando o lookup key no servidor antes de abrir a sessão de pagamento.
- Se o banco falhar, o site cai para o catálogo do código como rede de segurança, sem página em branco.

## 5. O que não muda

- Fluxo de pagamento, webhooks, dunning, cortesias e SSO continuam iguais.
- Nenhum preço de assinante existente é alterado por esta fase.
- Imagens de produto continuam na aba Imagens, como já funcionam.

## Detalhes técnicos

- Migração: `public.catalog_products` (key, name, url, landing, price_prefix, available, sort_order) e `public.catalog_plans` (product_key, name, tier, description, price_month_cents, price_year_cents, features jsonb, seats, cta_label, price_lookup_key, annual_lookup_key, active, sort_order), ambas com GRANT (`SELECT` para anon/authenticated; escrita só service_role), RLS com SELECT público restrito a `active`, e trigger `update_updated_at_column`. Seed literal com o conteúdo atual de `product-plans.ts` e `flexus-apps.ts` na mesma migração.
- Servidor: `src/lib/catalog.server.ts` (leitura + normalização + fallback para o código), `src/lib/catalog.functions.ts` (leitura pública via cliente publishable) e `src/lib/admin-catalog.functions.ts` (CRUD com `requireSupabaseAuth` + `requireAdminModule("produtos")` + `recordAudit`).
- Stripe: `src/lib/stripe.server.ts` ganha `ensureProduct`, `createPriceWithLookupKey` (transfere `lookup_key` com `transfer_lookup_key: true`) e `archivePrice`; a reconciliação lista `prices.list({ lookup_keys })` para comparar banco × Stripe.
- Front: `src/lib/product-plans.ts` vira apenas o fallback/tipos; as rotas de produto e `produtos.comparar-planos.tsx` recebem os planos por loader (`ensureQueryData`) em vez de import estático. `PLANS_BY_APP` continua exportado para o fallback.
- UI nova: `src/components/admin/CatalogPanel.tsx` e `CatalogPlanDialog.tsx`, plugados na aba Catálogo de `/admin/produtos`.
