## Objetivo

Adicionar dois novos produtos à linha FLEXUS — **FLEXUS | ABA** (clínicas de Análise do Comportamento Aplicada / autismo) e **FLEXUS | CRM** (CRM genérico de vendas multi-segmento) — replicando a estrutura das landing pages existentes.

## Entregáveis

1. **Duas novas landing pages** (mesmo template das atuais):
   - `/produtos/flexus-aba` → `src/routes/produtos.flexus-aba.tsx`
   - `/produtos/flexus-crm` → `src/routes/produtos.flexus-crm.tsx`

   Cada uma com hero, lista de funcionalidades, depoimentos e bloco de planos (Básico / Pro / Enterprise).

2. **Conteúdo dedicado por produto**

   **FLEXUS | ABA** (clínicas ABA / TEA):
   - Funcionalidades: registro de tentativas (DTT), programas de intervenção, gráficos de evolução por objetivo, planos terapêuticos individualizados, agenda de sessões, prontuário multidisciplinar, relatórios para responsáveis e convênios, gestão de equipe (BCBA, terapeutas), checklist de comportamentos, controle de horas autorizadas.
   - Depoimentos de clínicas ABA fictícias (BCBA, supervisora clínica).

   **FLEXUS | CRM** (vendas multi-segmento):
   - Funcionalidades: pipeline kanban, gestão de leads e oportunidades, automações de follow-up, e-mail e WhatsApp integrados, funil customizável, relatórios de conversão, metas por vendedor, importação de contatos, integração com formulários, app mobile.
   - Depoimentos de gestores comerciais fictícios.

3. **Imagens hero novas** (geradas via imagegen, padrão `1920x1080`, estilo coerente com as atuais):
   - `src/assets/hero-aba.jpg` — sala de terapia infantil moderna, materiais lúdicos, tablet com gráficos
   - `src/assets/hero-crm.jpg` — equipe de vendas com dashboards/pipeline em telas

4. **Pontos de integração atualizados**:
   - `src/routes/produtos.tsx` → adicionar 2 cards no array `products` (grid passa a ter 5 produtos, ajustando layout para `md:grid-cols-2 lg:grid-cols-3`).
   - `src/routes/index.tsx` → adicionar os 2 produtos no destaque da home + atualizar meta description para mencionar ABA e CRM.
   - `src/routes/produtos.comparar-planos.tsx` → adicionar blocos de comparação para ABA e CRM (mesma estrutura de planos mensal/anual).
   - `src/routes/sitemap[.]xml.tsx` → adicionar duas novas entradas.
   - `src/components/Header.tsx` → se houver dropdown de produtos, adicionar links para ABA e CRM (a verificar ao implementar).

5. **Preços no Stripe** (mesma faixa dos atuais — R$ 99 / 199 / 399):
   Via `payments--batch_create_product`, criar 2 produtos com 3 preços mensais cada:
   - `flexus_aba_basico_mensal` = R$ 99,00
   - `flexus_aba_pro_mensal` = R$ 199,00
   - `flexus_aba_enterprise_mensal` = R$ 399,00 (Enterprise mantém CTA "Falar com Consultor", sem priceId — igual aos outros)
   - `flexus_crm_basico_mensal` = R$ 99,00
   - `flexus_crm_pro_mensal` = R$ 199,00
   - `flexus_crm_enterprise_mensal` = R$ 399,00

   Tax code Stripe: `txcd_10103001` (SaaS). Cobrança em BRL, recorrência mensal, `quantity_min/max = 1`.

## Notas técnicas

- O `routeTree.gen.ts` é regenerado automaticamente pelo plugin do TanStack Router ao salvar os novos arquivos de rota — não tocar manualmente.
- Os priceIds usados nos arrays `plans` das novas páginas devem bater exatamente com os IDs criados no Stripe.
- Reaproveitar `PricingCards`, `useStripeCheckout` e `trackCTAClick` exatamente como nas páginas existentes.
- Ícones sugeridos: `Brain` (lucide) para ABA, `Users` ou `TrendingUp` para CRM.

## Fora de escopo

- Mudanças no fluxo de checkout/edge function `create-checkout` (já corrigido em interação anterior).
- Comparativos Enterprise com priceId real (mantém "Falar com Consultor" como nos demais).
