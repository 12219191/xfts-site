# Comparação de planos por sistema

Hoje `/produtos/comparar-planos` lista, uma abaixo da outra, as tabelas de todos os 5 produtos FLEXUS (Clínica, Barbearia, Estética, ABA, CRM). O link "Comparar todos os planos em detalhe" nas páginas de produto leva para essa lista completa, misturando sistemas diferentes.

## O que muda

1. **Comparação por produto**: a página passa a mostrar apenas um sistema por vez (Básico / Pro / Enterprise daquele sistema), nunca produtos diferentes lado a lado.
2. **Seletor de sistema**: no topo da página, abas com os 5 produtos FLEXUS para trocar de sistema. Ao entrar sem escolha, abre o primeiro produto (Clínica) por padrão.
3. **Link contextual nas páginas de produto**: o link "Comparar todos os planos em detalhe" na página do FLEXUS | Barbearia abre direto a comparação da Barbearia; o mesmo para Clínica, Estética, ABA e CRM. O texto passa a ser "Comparar os planos do FLEXUS | [Sistema] em detalhe".
4. **Header**: o link "Planos" continua levando à página, abrindo no produto padrão com o seletor visível.

## Detalhes técnicos

- `src/routes/produtos.comparar-planos.tsx`: adicionar `validateSearch` para um parâmetro de busca `produto` (slug: `clinica | barbearia | estetica | aba | crm`), acrescentar um campo `key` a cada item do array `products` existente, e renderizar apenas o produto selecionado em vez do `products.map(...)`. Seletor em abas acima da tabela atualiza a search param (`navigate({ search })`), mantendo o toggle Mensal/Anual e o FAQ como estão.
- `src/components/PricingCards.tsx`: nova prop opcional `compareProduct` (o slug) e `productName`; o `<Link>` de comparação passa `search={{ produto: compareProduct }}` quando informada.
- As 5 rotas de produto (`produtos.gestao-clinica`, `produtos.gestao-barbearias`, `produtos.gestao-esteticas`, `produtos.flexus-aba`, `produtos.flexus-crm`) passam a nova prop ao `PricingCards`.
- Título/description da rota permanecem, com pequeno ajuste de texto para refletir comparação por sistema.

Nenhuma mudança de preços, funcionalidades listadas ou checkout.
