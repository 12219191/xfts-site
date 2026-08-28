# Corrigir o erro "Something went wrong" ao clicar em "Comece agora"

## O que já foi verificado

- A conta de pagamentos do ambiente de teste e a chave pública do preview pertencem à mesma conta (nenhuma incompatibilidade de conta).
- Todos os 24 planos existem no ambiente de teste com as chaves de busca corretas, incluindo Casa360°, CRM e Barbearia.

Ou seja: a causa não é falta de plano nem conta errada. A mensagem "Something went wrong / Please try again or contact the merchant" é a tela genérica do provedor de pagamento, exibida quando o componente de checkout embutido não consegue iniciar a sessão.

## Problema real de experiência (independente da causa raiz)

Hoje, quando o servidor recusa a compra por uma regra de negócio — por exemplo "Você já tem uma assinatura ativa deste sistema, use Minha conta para trocar de plano" ou "produto indisponível para contratação" — essa mensagem em português nunca chega ao usuário. Ela é lançada como erro dentro do carregamento do checkout, e o provedor substitui tudo pela tela genérica em inglês. O cliente vê "Something went wrong" mesmo quando a recusa foi intencional e explicável.

## Plano

1. **Separar a validação da renderização do checkout.**
   Pedir a sessão de pagamento antes de montar o componente do provedor. Se a resposta trouxer erro, exibir a mensagem em português (aviso na tela/toast, com atalho para "Minha conta" quando o motivo for assinatura duplicada) e não abrir o checkout. Só montar o checkout embutido quando a sessão existir de fato.

2. **Registrar o motivo real da falha.**
   Gravar no log do servidor o motivo de cada recusa/erro de criação de sessão (usuário, plano, ambiente, mensagem do provedor), para que qualquer nova ocorrência seja identificável sem tentativa e erro.

3. **Reproduzir e confirmar a causa raiz.**
   Com a mensagem real visível, abrir "Comece agora" em um produto e ler o motivo exato. Duas hipóteses a confirmar nessa etapa:
   - recusa por regra de negócio (assinatura ativa do mesmo sistema na conta usada no teste);
   - falha ao renderizar o checkout embutido dentro do iframe do preview, caso a sessão seja criada com sucesso.
   Se for a segunda, ajustar o modo de checkout usado na criação da sessão para o modo embutido compatível com o componente, ou abrir o pagamento em aba própria a partir do preview.

4. **Validar o fluxo ponta a ponta** em um produto onde a conta de teste ainda não tenha assinatura, confirmando que o checkout abre, e que a recusa por duplicidade mostra a mensagem correta em português.

## Detalhes técnicos

- `src/components/StripeEmbeddedCheckout.tsx`: `fetchClientSecret` hoje lança `new Error(result.error)`; passar a resolver o `clientSecret` antes de renderizar `EmbeddedCheckoutProvider` e propagar o erro ao chamador.
- `src/hooks/useStripeCheckout.tsx`: passa a receber e exibir o erro (toast + estado), sem abrir o modal quando não há sessão.
- `src/lib/checkout.functions.ts`: manter as regras atuais, acrescentando log estruturado dos retornos `{ error }` e das exceções do provedor; revisar o `ui_mode` usado (`embedded_page`) contra o componente `<EmbeddedCheckout />`.
