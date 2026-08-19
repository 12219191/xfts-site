# Corrigir o erro "No such customer" no Portal de Cobrança

## O que está acontecendo

As três assinaturas existentes hoje na base (Barbearia, CRM e Casa360°, todas do
mesmo usuário, em ambiente sandbox) são registros de teste criados manualmente
para validar o SSO. Elas usam identificadores fictícios:

- `stripe_customer_id = test_cus_lb`
- `stripe_subscription_id = test_sub_barbearia | test_sub_crm | test_sub_casa360`

Esses IDs não existem no Stripe. Quando o botão "Abrir portal" chama o Stripe com
`test_cus_lb`, o provedor responde `No such customer` — o código do portal está
correto, o dado é que é simulado.

## Correção proposta

### 1. Proteger a área do cliente contra registros simulados

Tratar assinaturas com IDs de teste como "sem cobrança real":

- Não exibir o cartão "Portal de cobrança" quando o `stripe_customer_id` não
  começar com `cus_` (o prefixo real do Stripe).
- No lugar, mostrar um aviso discreto: "Assinatura de demonstração — o portal de
  cobrança fica disponível após uma compra real."
- Aplicar a mesma proteção nas ações de trocar plano, cancelar e reativar, que
  hoje também falhariam no Stripe pelo mesmo motivo.

### 2. Mensagem de erro clara quando o cliente não existe no Stripe

No servidor, quando o Stripe responder `resource_missing`, devolver uma mensagem
em português explicando que o cadastro de cobrança não foi encontrado e sugerindo
refazer a assinatura, em vez do texto técnico em inglês.

### 3. Limpeza dos registros de teste (opcional, sob confirmação)

Remover as três linhas simuladas de `subscriptions` para que a área do cliente
volte ao estado "nenhuma assinatura ativa" e o fluxo real de checkout no sandbox
possa ser testado de ponta a ponta. Isso só é feito se você confirmar — se os
registros ainda forem úteis para testar SSO e provisionamento, mantemos e apenas
os itens 1 e 2 entram.

## Detalhes técnicos

- `src/routes/minha-conta.tsx`: derivar `hasRealBilling = stripe_customer_id?.startsWith("cus_")`
  a partir do registro carregado; usar essa flag para condicionar o cartão do
  portal e os botões de plano/cancelamento.
- `src/lib/subscriptions.functions.ts`: em `createPortalSession`, `changePlan`,
  `cancelSubscription` e `reactivateSubscription`, retornar
  `{ error: "Esta é uma assinatura de demonstração..." }` quando o ID não tiver o
  prefixo real, antes de chamar o Stripe; e mapear `resource_missing` para uma
  mensagem amigável no retorno de erro.
- Limpeza (se aprovada): migração `delete from public.subscriptions where stripe_customer_id = 'test_cus_lb'`.
