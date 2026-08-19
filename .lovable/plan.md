# Card "Usuários do plano" mostrando o plano antigo após o upgrade

## O que aconteceu

O upgrade do CRM foi aplicado corretamente: no banco a assinatura está como
`flexus_crm_pro_mensal` (Pro, mensal), verificado agora.

O que você viu é a tela lendo o plano antes da confirmação chegar. A troca de plano é
feita no provedor de pagamento e o banco só é atualizado quando o aviso (webhook) do
provedor chega — alguns segundos depois. A página recarrega os dados imediatamente
após o clique, ou seja, quase sempre antes disso, e por isso mostrou "Básico (mensal)".

Além disso, o texto do card é confuso mesmo quando está certo:
- diz "faça upgrade de plano" até para quem já está no plano mais alto;
- "Uso ainda não reportado pelo sistema" não explica que é o sistema FLEXUS
  (Barbearia/CRM/Casa360) que informa quantos usuários estão em uso.

## O que vou mudar

1. **Refletir o plano novo na hora**
   - A ação de troca de plano passa a devolver o plano aplicado.
   - Em upgrade (aplicado na hora) a tela atualiza o plano imediatamente e continua
     recarregando por alguns segundos, até o banco confirmar — sem exibir plano antigo.
   - Em downgrade (agendado) o card segue mostrando o plano atual, com o aviso de que a
     troca entra na próxima renovação.

2. **Texto do card de usuários mais claro**
   - "Até N usuários inclusos no plano Pro (mensal)."
   - Sem uso reportado: "O sistema ainda não informou quantos usuários estão ativos."
   - A frase de upgrade só aparece quando existe um plano superior disponível;
     no Enterprise/ilimitado o card informa que não há limite de usuários.

3. **Assinaturas de demonstração no seletor**
   - Ainda existem registros antigos de teste (Barbearia/CRM/Casa360) misturados às
     assinaturas reais no seletor de sistema, o que ajuda a confundir qual plano está
     sendo exibido. Posso removê-los junto — me diga se quer.

## Detalhes técnicos

- `changePlan` em `src/lib/subscriptions.functions.ts` passa a retornar
  `appliedPriceId` quando a troca é imediata.
- `src/routes/minha-conta.tsx`: `runAction` recebe o novo `price_id` e atualiza o estado
  local; adiciona re-fetch curto com backoff (ex. 2s/4s/8s) até o `price_id` do banco
  bater com o aplicado.
- Card de usuários usa `seatsFromPriceId` + presença de `upgradeOption` para decidir a
  chamada de upgrade; sem alteração de schema.
