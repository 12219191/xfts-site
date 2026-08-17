# Testar o fluxo completo (hub → Barbearia, CRM, Casa360°)

Estado atual verificado: os segredos `FLEXUS_SSO_SECRET`, `FLEXUS_APP_KEY_BARBEARIA`, `_CRM` e `_CASA360` já existem, e a tabela de assinaturas está **vazia** — por isso hoje o botão "Acessar Sistema" e a área "Meus sistemas" não liberam nada. O teste tem duas etapas: primeiro um atalho para validar o SSO, depois uma compra real no sandbox para validar cobrança + provisionamento.

## Etapa 0 — Checagem dos sistemas (5 min)

Confirmar que os três domínios respondem nas rotas combinadas:

- `GET https://xfts-flexus6.com/sso` (e 7 e 8) — deve responder a página de SSO, não o HTML genérico do app.
- `POST https://xfts-flexus8.com/api/provision` — deve responder JSON (401 sem assinatura é ótimo sinal).

Se algum responder HTML de SPA, o hub trata como falha e registra em `subscription_events` — descobrir isso antes evita diagnóstico errado depois.

## Etapa 1 — Atalho: assinatura de teste no banco

Inserir uma assinatura sandbox para `lbruttin@xfts.com.br` em cada um dos três produtos (Pro, ativa, período terminando em 30 dias), com os `price_id` no formato que o hub usa para mapear produto (`gestao_barbearias_pro_*`, `flexus_crm_pro_*`, `flexus_casa360_pro_*`).

Com isso dá para testar imediatamente:

1. `/minha-conta` → "Meus sistemas" mostra os três cartões como ativos.
2. Clicar em "Acessar Sistema" → o hub gera um token de 2 min e redireciona para `https://xfts-flexus6.com/sso?token=...`.
3. O sistema chama `/api/public/sso/verify` no hub, recebe `{ email, plano, papel, limite_usuarios, ativo }` e cria a sessão local. Como o e-mail é o mesmo das suas contas atuais, ele deve **casar com a conta existente** em vez de criar outra — esse é o ponto crítico a observar.
4. Repetir o mesmo link: deve falhar ("token já utilizado") — confirma o uso único.
5. Revalidação: `GET /api/public/entitlements?app=crm&user_id=...` com a chave do app deve devolver `ativo: true`.

## Etapa 2 — Compra real no sandbox

Com cartão de teste `4242 4242 4242 4242`, comprar um plano (sugiro Casa360° Básico) já logado:

1. Checkout conclui e volta em `/checkout/retorno`.
2. O webhook grava a assinatura e dispara o provisionamento assinado para `https://xfts-flexus8.com/api/provision` com evento `created`.
3. Conferir no sistema que a conta foi liberada no plano correto, e no `/admin` que a assinatura aparece com o status certo.
4. Cancelar pela `/minha-conta`: o sistema deve receber `canceled` e manter o acesso até o fim do período.
5. Upgrade Básico → Pro: o sistema deve receber `updated` com o novo limite de usuários.

## Etapa 3 — Limpeza

Remover as assinaturas de teste da Etapa 1 (as da Etapa 2 podem ficar, são sandbox) e revisar `subscription_events` para ver se alguma chamada de provisionamento falhou.

## Detalhes técnicos

- Assinaturas de teste entram por migração/insert direto em `public.subscriptions` com `environment = 'sandbox'`, `status = 'active'`, `stripe_subscription_id` prefixado com `test_` para facilitar a limpeza.
- Vinculação por e-mail: o hub envia `email` no payload de `verify` e de `provision`; o casamento com a conta existente acontece **do lado do sistema** — se hoje ele cria conta nova, é lá que precisa mudar para "buscar por e-mail e, se existir, vincular".
- Casos a observar no `verify`: token expirado (>2 min), token reutilizado, assinatura inexistente para aquele produto, e `past_due` (deve bloquear após a carência de 3 dias).
- Para os testes de endpoint eu uso chamadas diretas com a `x-flexus-app-key` correspondente; o resultado de cada passo fica registrado na conversa.
