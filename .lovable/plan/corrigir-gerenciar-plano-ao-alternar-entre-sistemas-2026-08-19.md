# Corrigir "Gerenciar Plano" ao alternar entre sistemas

## O que está acontecendo

Confirmado nos dados: a assinatura nova do CRM está correta no banco
(`flexus_crm_basico_mensal`, ativa). O problema é só de leitura na tela.

A página `/minha-conta` descobre o nível do plano a partir do campo
`product_id`, que agora guarda o identificador interno do provedor de
pagamento (ex.: `prod_V5e4WZSf19puDh`). Como esse texto contém as letras
"pro" (de **prod**_...), qualquer assinatura real é lida como plano **Pro** —
por isso o CRM Básico aparece como Pro e o único card oferecido é
"Mudar para Básico", sem opção de upgrade.

As assinaturas antigas de demonstração (`prod_test_...`) não têm esse
problema, o que explica por que o Casa360 parecia certo antes.

## Correção

1. Passar a derivar o plano do `price_id` (ex.: `flexus_crm_basico_mensal`),
   que já é a fonte usada no resto do site (`planTierFromPriceId`), e
   remover a detecção por `product_id`.
2. Reconstruir os cards de "Gerenciar Plano" a partir do sistema e do plano
   realmente selecionados:
   - Básico → card "Upgrade para Pro" (imediato, pró-rata) e caminho Enterprise.
   - Pro → card "Upgrade para Enterprise" (quando houver preço) e
     "Mudar para Básico" (agendado para a próxima renovação).
   - Enterprise → apenas downgrades (Pro / Básico), agendados.
3. Preservar o ciclo (mensal/anual) ao montar o plano de destino, em vez de
   assumir mensal, e usar os planos reais do catálogo do sistema selecionado
   (`src/lib/product-plans.ts`) em vez do mapa fixo de nomes/preços.
4. Garantir que trocar o sistema no seletor atualize também o resumo, os
   nomes e os preços exibidos (hoje o nome do plano e o preço vêm do mapa
   fixo genérico).

## Detalhes técnicos

- `src/routes/minha-conta.tsx`: remover `detectPlanFromProductId` e o
  `planMap` local; derivar `currentTier` de `planTierFromPriceId(price_id)`
  e os planos disponíveis do catálogo do produto (`appKeyFromPriceId`).
- Alvo da troca: montar o lookup key com prefixo do sistema + tier destino +
  intervalo atual (`billingIntervalFromPriceId`), validando que existe no
  catálogo antes de chamar `changePlan`.
- Nenhuma mudança de banco, webhook ou lógica de cobrança; `changePlan` já
  trata upgrade imediato e downgrade agendado por `subscriptionId`.

## Como testar

1. Em `/minha-conta`, alternar entre Casa360 e CRM no seletor.
2. Conferir que o CRM aparece como **Básico** e oferece "Upgrade para Pro".
3. Fazer o upgrade e confirmar cobrança proporcional; depois voltar para
   Básico e confirmar que fica agendado para a próxima renovação.
