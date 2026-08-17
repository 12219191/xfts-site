# Novo produto: FLEXUS | Casa360°

Adicionar o sexto produto da linha FLEXUS — um ERP doméstico (estoque, compras e finanças da casa) — seguindo exatamente o mesmo padrão usado em FLEXUS | ABA e FLEXUS | CRM.

## Posicionamento

- Nome: FLEXUS | Casa360°
- Promessa: "Estoque, compras e finanças da sua casa em um só lugar"
- Dores: comprar duplicado, perder validade, não saber para onde vai o dinheiro do mês
- Uso: sozinho, com quem mora com você ou com a família toda
- Pilares: Estoque da casa (despensa, geladeira, armário) · Lista automática (itens baixos entram sozinhos) · Finanças (receitas, despesas, contas, categorias) · Visão da casa (painel do dia)

## O que será feito

1. **Nova landing** em `/produtos/flexus-casa360`, com a mesma estrutura das outras: hero com imagem, lista de funcionalidades, seção de benefícios/dores, depoimentos, tabela de planos e CTA final.
2. **Imagem hero** gerada sob medida (cozinha/despensa organizada com painel digital), no mesmo estilo visual das demais.
3. **Planos** Básico R$ 99 / Pro R$ 199 / Enterprise R$ 399, com produtos e preços criados no gateway de pagamento para o checkout funcionar como nos outros SaaS.
4. **Card na home** e na página `/produtos`, com "Saiba mais" apontando para a nova rota.
5. **Comparação de planos**: nova aba "FLEXUS | Casa360°" em `/produtos/comparar-planos`, com a tabela de funcionalidades por plano, e o link contextual na landing.
6. **SEO**: title, meta description (<160), Open Graph, Twitter Card, canonical e entrada no `sitemap.xml`.

## Detalhes técnicos

- Novo arquivo `src/routes/produtos.flexus-casa360.tsx` espelhando `produtos.flexus-crm.tsx` (mesmos componentes: `PricingCards`, `useStripeCheckout`, `trackCTAClick`), com `compareProduct="casa360"` e `productName="FLEXUS | Casa360°"`.
- `src/assets/hero-casa360.jpg` gerado via imagegen e usado no hero e nos og/twitter images.
- `src/components/PricingCards.tsx`: acrescentar `"casa360"` ao tipo `CompareProduct`.
- `src/routes/produtos.comparar-planos.tsx`: acrescentar `"casa360"` a `PRODUCT_KEYS` e um novo item ao array `products` com preços 99/199/399 e ~12 linhas de funcionalidades (estoque, validade, lista automática, finanças, contas recorrentes, membros da casa, relatórios, app mobile, integrações, suporte).
- `src/routes/index.tsx` e `src/routes/produtos.tsx`: novo card no grid de produtos.
- `src/routes/sitemap[.]xml.tsx`: nova URL.
- Price IDs no padrão existente: `flexus_casa360_basico_mensal`, `flexus_casa360_pro_mensal`, `flexus_casa360_enterprise_mensal`, criados no gateway em BRL.

Nada muda nos produtos existentes além do acréscimo do novo item nas listagens e na comparação.
