# Corrigir "Começar Agora" na página de comparação de planos

## Problema confirmado

Na página `/produtos/comparar-planos`, os botões do rodapé da tabela (Básico "Começar", Pro "Começar Agora" e Enterprise) estão todos envolvidos por um link para `/contato`. Por isso o clique leva ao formulário de contato em vez de abrir o checkout.

Nas páginas de produto (Clínica, Barbearia, Estética, ABA, CRM, Casa360) o comportamento já está correto: Básico/Pro abrem o checkout do Stripe e apenas Enterprise vai para `/contato`.

## O que será feito

1. Ligar os botões Básico e Pro da tabela de comparação ao mesmo fluxo de checkout usado nas páginas de produto.
2. Respeitar o seletor Mensal/Anual já existente na página: se o usuário estiver em "Anual", o botão abre o preço anual do plano; caso contrário, o mensal.
3. Manter o botão Enterprise apontando para `/contato` ("Falar com Consultor").
4. Manter o rastreamento de CTA atual, ajustando o destino registrado de `/contato` para `/checkout` nos botões que passam a comprar.

## Detalhes técnicos

- Em `src/routes/produtos.comparar-planos.tsx`: adicionar `useStripeCheckout` (hook já usado nas páginas de produto) e renderizar o modal de checkout embutido no topo da página, igual ao padrão de `produtos.gestao-esteticas.tsx`.
- Mapear cada `ProductKey` da tabela para a lista de planos correspondente em `src/lib/product-plans.ts` para obter `priceId` (mensal) e `annualPriceId` (anual) de Básico e Pro.
- Substituir os `<Link to="/contato">` das colunas Básico e Pro por botões que chamam `openCheckout({ priceId, returnUrl: ... /checkout/retorno?session_id={CHECKOUT_SESSION_ID} })`.
- Nenhuma mudança em backend, catálogo Stripe ou regras de assinatura.

## Como testar

1. Abrir `/produtos/comparar-planos?produto=casa360`.
2. Clicar em "Começar Agora" (Pro) — deve abrir o checkout do plano Pro mensal.
3. Alternar para "Anual" e clicar novamente — deve abrir o checkout do preço anual.
4. Clicar em "Falar com Consultor" (Enterprise) — deve continuar indo para `/contato`.
