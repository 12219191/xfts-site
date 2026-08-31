# Páginas reais de Clínica e Barbearia com dados do Control Center

Hoje as duas páginas ficaram magras: herói + lista fixa de funcionalidades + tabela de planos. O texto de apresentação está escrito no código, e não há nenhuma seção explicando como o cliente paga. Os planos já vêm do Control Center; o resto não.

## O que muda

**1. Descrição vinda do Control Center**
- Título, subtítulo e descrição curta da página passam a usar os campos do produto cadastrados no Control Center (`displayName`, `headline`, `subheadline`, `shortDescription`, imagem e texto alternativo), com o conteúdo atual de código apenas como reserva caso o campo esteja vazio.
- O aviso de beta e o status do produto passam a aparecer na página quando existirem (por exemplo, "acesso antecipado" ou produto sem contratação disponível).

**2. Valores reais e o que cada plano entrega**
- A seção de funcionalidades deixa de ser uma lista fixa: ela é montada a partir dos recursos dos planos ativos do produto no Control Center, sem repetições.
- Cada plano mostra valor mensal e anual (com o desconto), a descrição do plano, número de usuários/profissionais incluídos e dias de teste grátis, quando cadastrados.
- Se o produto não tiver nenhum plano ativo ou não estiver liberado para contratação, a página mostra um bloco de "fale com o time" em vez de preços quebrados.

**3. Forma de pagamento explícita**
- Nova seção "Como funciona o pagamento" nas duas páginas: cartão de crédito, cobrança recorrente mensal ou anual, renovação automática, cancelamento a qualquer momento com acesso até o fim do período pago, emissão de recibo/fatura na área do cliente e pagamento processado em ambiente seguro.
- Perguntas frequentes curtas sobre cobrança (troca de plano com cobrança proporcional, downgrade agendado, o que acontece se o pagamento falhar).

**4. SEO e dados estruturados**
- Título, descrição, og e JSON-LD passam a usar o menor preço real dos planos do Control Center em vez do valor escrito no código, para não divergir quando o preço mudar.

## Detalhes técnicos

- `src/routes/produtos.gestao-clinica.tsx` e `src/routes/produtos.gestao-barbearias.tsx`: loader passa a devolver também o `CatalogProduct` (`snapshot.products.find(...)`) além de `plansForProduct`.
- Criar `src/components/product/ProductPageLayout.tsx` (ou similar) com as seções compartilhadas — herói, funcionalidades derivadas dos planos, planos, pagamento, FAQ — para as duas páginas usarem o mesmo componente e evitar duplicação.
- Criar `src/components/product/PaymentInfoSection.tsx` com o bloco de forma de pagamento e FAQ de cobrança (conteúdo estático, sem chamada ao provedor de pagamento).
- Reaproveitar `PricingCards`, `useStripeCheckout` e `AcessarSistemaButton` como estão; incluir `trialDays` e `seats` exige expor esses campos em `toProductPlan`/`PricingCards`.
- `PRODUCT_CONTENT` e `product-plans.ts` continuam como fallback quando o banco não responder.
- Nenhuma alteração de schema, migração ou lógica de cobrança.
