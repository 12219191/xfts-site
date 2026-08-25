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

## O que acontece com os dados de teste que existem hoje

Hoje há 5 assinaturas na base, todas `environment = sandbox`:

- 2 reais de teste (Casa360 Pro e CRM Pro, cliente `cus_V6UAR…`), criadas pelo checkout em modo teste;
- 3 simuladas (`test_cus_lb`), criadas à mão para validar SSO.

O que acontece:

- **Nada é apagado.** Os registros continuam no banco e no /admin, marcados como `sandbox`.
- **Continuo acessando?** Sim, para consulta/histórico no /admin e via banco. Elas não migram para a conta live e deixam de aparecer para clientes reais (todas as telas filtram por `environment`), e as ações de cobrança delas não funcionarão em live — o Stripe live não conhece esses clientes.
- **A conta de teste do Stripe continua existindo** depois do go-live: ao vincular a conta da XFTS, o ambiente de teste passa a ser o "modo teste" dessa conta, e você segue podendo testar com cartão `4242…` sem cobrança real.
- Sugiro, depois do go-live, apagar as 3 linhas simuladas (`test_cus_lb`) para o painel refletir só dados coerentes; as 2 de teste real podem ficar como histórico.

## Beta testers que não pagam

Duas formas, e recomendo usar as duas juntas:

1. **Cupom / trial no Stripe (preferida)** — o beta tester passa pelo checkout normal, com 100% de desconto por N meses ou período de teste sem cartão. Vantagens: o fluxo é idêntico ao do cliente pagante (webhook, limites de usuários, SSO, área do cliente), e quando o desconto termina ele vira cliente pagante sem retrabalho. Preciso apenas criar os cupons na conta live e um campo de cupom no checkout.
2. **Assinatura cortesia sem Stripe** — para casos em que ninguém deve passar pelo checkout: uma tela no /admin onde você concede acesso a um e-mail escolhendo sistema, plano e validade. Isso grava uma assinatura marcada como cortesia (sem `cus_`/`sub_` do Stripe), libera o sistema pelo mesmo provisionamento e limites, e as telas de cobrança ficam ocultas com a etiqueta "Cortesia — válido até dd/mm". No fim da validade o acesso é bloqueado automaticamente e você recebe o aviso para converter ou renovar.

Se quiser, implemento os dois na mesma etapa, junto do go-live.

## Próximo passo

Abra a aba de Pagamentos e conclua o passo 1 (vincular a conta da XFTS). Em paralelo, me diga se quer os beta testers por **cupom no checkout**, por **cortesia no admin**, ou os dois — e eu já preparo essa parte.

