# Cortesias não aparecem em "Minha conta"

## O que está acontecendo

Confirmei no banco: a conta `luciano.bruttin@gmail.com` tem sim as duas assinaturas de cortesia ativas (Casa360 Pro e CRM Pro, válidas até 27/08/2027) e a Isabela está vinculada como equipe.

O problema não é a importação — é um filtro de ambiente. As cortesias foram gravadas no ambiente de pagamento **produção (live)**. A tela `/minha-conta` só lista assinaturas do ambiente em que a página está rodando; no preview do editor a página roda em modo **teste (sandbox)**, então ela procura assinaturas "sandbox", não encontra nenhuma e mostra "sem acesso ao sistema".

Ou seja: no site publicado (xfts-flexus.com) o acesso deve aparecer normalmente; no preview, não.

## Correção proposta

Cortesias são concedidas manualmente e não pertencem a nenhum ambiente de pagamento — não faz sentido escondê-las por ambiente. Ajustar as leituras para considerar sempre as cortesias, além das assinaturas do ambiente atual:

1. `/minha-conta` (`src/routes/minha-conta.tsx`): trocar o filtro fixo de ambiente por "assinaturas do ambiente atual **ou** cortesias", para os cards Meus Sistemas, Meus Recursos, Equipe e Gerenciar plano enxergarem as cortesias em qualquer ambiente.
2. Leitura de assinaturas no servidor (`src/lib/subscriptions.server.ts`): mesma regra, para que o botão "Acessar sistema", o SSO e os entitlements liberem acesso à Casa360 e ao CRM.
3. Ações de cobrança (portal, upgrade, cancelamento) continuam bloqueadas para cortesias, como já são hoje — a cortesia não tem assinatura real no provedor de pagamento.

## Verificação

Depois do ajuste, entrar em `/minha-conta` com `luciano.bruttin@gmail.com` e confirmar: dois sistemas listados (Casa360 e CRM) como Pro cortesia, Isabela aparecendo em Equipe e o botão de acessar cada sistema funcionando.

## Detalhes técnicos

- Filtro atual: `.eq("environment", env)`; passa a `.or("environment.eq.<env>,is_courtesy.is.true")`.
- Sem alteração de schema nem novo dado; apenas leitura.
- `getStripeEnvironment()` continua definindo o ambiente para checkout e portal — nada muda no fluxo de compra.
