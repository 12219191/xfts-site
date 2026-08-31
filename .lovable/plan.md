# Padronizar as demais páginas de produto (ABA, Casa360°, CRM, Estética)

Clínica e Barbearia já usam o layout novo, com conteúdo e preços vindos do Control Center. As outras quatro páginas ainda têm textos fixos no código, depoimentos fictícios e nenhum bloco explicando a forma de pagamento.

## Estado atual verificado

| Página | Situação no Control Center | Página hoje |
| --- | --- | --- |
| FLEXUS \| CRM | ativo, à venda | preços do catálogo, mas funcionalidades e depoimentos fixos |
| FLEXUS \| Casa360° | ativo, à venda | idem |
| FLEXUS \| ABA | em desenvolvimento, sem venda | mostra preços como se estivesse à venda |
| FLEXUS \| Estética | em desenvolvimento, sem venda | idem |

## O que será feito

1. Migrar as quatro páginas para o mesmo layout unificado usado em Clínica/Barbearia.
2. Descrição, título e imagem passam a vir do Control Center (com o texto atual como reserva, caso o campo esteja vazio).
3. Funcionalidades derivadas dos planos ativos, como já acontece nas outras duas páginas.
4. Preços reais (mensal/anual com 20% no anual), usuários incluídos e período de teste.
5. Seção "Como funciona o pagamento" com FAQ de cobrança, cancelamento e segurança em todas elas.
6. ABA e Estética passam a exibir o estado "valores sob consulta" com CTA de contato, já que não estão liberadas para compra — sem botão de checkout que falharia.
7. Remoção dos depoimentos fictícios (mesma correção de SEO já aplicada em Clínica e Barbearia).
8. Metadados de SEO com o preço "a partir de" calculado dinamicamente; nas páginas sem venda, texto sem preço.

## Detalhes técnicos

- Arquivos alterados: `src/routes/produtos.flexus-aba.tsx`, `produtos.flexus-casa360.tsx`, `produtos.flexus-crm.tsx`, `produtos.gestao-esteticas.tsx`.
- Reuso de `ProductPageLayout` e `PaymentInfoSection`; loader busca `getPublicCatalog()` e `plansForProduct(snapshot, key)`, igual às páginas já migradas.
- Nenhuma mudança de rota, URL ou dado no banco.

## Verificação

Conferir as quatro páginas no preview: CRM e Casa360° com preços reais e checkout ativo; ABA e Estética em modo "sob consulta".
