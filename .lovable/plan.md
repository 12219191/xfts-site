# Trocar a conta de pagamentos atual pela conta Stripe da XFTS

Hoje o site cobra através de uma conta de **teste (sandbox)** criada automaticamente para o projeto (`acct_1U5Eik…`), que ainda **não foi vinculada a nenhuma conta Stripe real**. Nada de dinheiro real passa por ela. Para passar a receber na conta da XFTS, o caminho correto é vincular (claim) essa conta e concluir o go-live — não é preciso trocar chaves de API manualmente nem mexer no código de checkout.

## O que você faz (na aba Pagamentos)

Os passos abaixo são feitos por você na interface, porque envolvem login e dados fiscais da XFTS:

1. **Vincular a conta** — escolher "conta Stripe existente" e entrar com o login da XFTS (ou criar a conta da XFTS, se ainda não existir).
2. **Formulário de go-live** — CNPJ, dados bancários da XFTS, descritor da fatura.
3. **Instalar o app Lovable na conta LIVE** da XFTS (um clique dentro do Stripe).
4. **Chaves live** — criadas automaticamente pela plataforma, sem ação sua.
5. **Verificação de prontidão** — confirma que o checkout live está liberado.

Enquanto esses passos não terminam, o checkout continua funcionando só em modo teste, exatamente como está hoje.

## O que eu faço depois que a conta live existir

- **Recriar o catálogo na conta live**: os 12 produtos + planos mensais/anuais (com os mesmos `lookup_key`, ex. `casa360_pro_mensal`) precisam existir na conta da XFTS. O código busca preço por `lookup_key`, então mantendo os mesmos identificadores nada mais muda.
- **Webhook live**: apontar o endpoint de eventos para a URL pública do site em modo live e conferir o segredo de assinatura live.
- **Conferir a separação de ambientes**: a tabela de assinaturas guarda `environment` (`sandbox`/`live`), então as assinaturas de teste que você criou (Casa360 Pro, CRM) continuam separadas e não aparecem para clientes reais.
- **Teste ponta a ponta em live**: uma assinatura real de menor valor, confirmando webhook, área do cliente, portal de cobrança e cancelamento — e depois o estorno dela.

## Observações importantes

- As assinaturas de teste **não migram** para a conta live: assinantes reais precisam assinar novamente na conta da XFTS. Como hoje só existem assinaturas de teste, não há impacto em clientes.
- O ambiente é escolhido automaticamente pela chave publicável do projeto; nenhuma alteração de código é necessária para "virar a chave".
- Se a XFTS preferir usar as próprias chaves secretas do Stripe em vez do modelo gerenciado, isso é possível, mas perde a criação automática de chaves e a proteção do gateway — só recomendo se houver exigência interna.

## Próximo passo

Abra a aba de Pagamentos e conclua o passo 1 (vincular a conta da XFTS). Quando terminar, me avise que eu recrio o catálogo em live e faço o teste ponta a ponta.
