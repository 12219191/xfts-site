# Opção A: mover a cortesia do Casa360° da conta A para a conta B

Escopo: só o Casa360°. CRM, Barbearia e Atende não mudam. Nada no Stripe muda, porque a assinatura é uma cortesia sem cliente no Stripe.

## O que muda
- A cortesia live do Casa360 (`flexus_casa360_pro_mensal`, ativa até 27/08/2027) passa da conta A (luciano.bruttin@gmail.com, 2f04e8f3-…) para a conta B (lbruttin@xfts.com.br, f654ced0-…).
- Só o dono (`user_id`) muda. O id, o preço, as datas, o status e o credit_anchor ficam iguais.
- O convite do Casa360 aceito pela Isabela e os eventos dessa assinatura também passam para B. Assim, ela continua no time.

## Passos
1. **Backup:** copiar as linhas afetadas de `subscriptions`, `account_invites` e `subscription_events` para `backup_casa360_20261008`. Contar as linhas antes.
2. **Transação única:** trocar o dono das 3 linhas e registrar em `admin_audit_log` o antes, o depois e o motivo "regularização Casa360 – unificação parcial". Contar as linhas depois.
3. **Conferir:** em "Minha conta" da conta B, o Casa360 aparece ativo, sem a mensagem "Acesso bloqueado", e os entitlements respondem `ativo: true`.

## Risco no Casa360 (precisa de ação do lado dele)
O Casa360 liga o usuário pelo e-mail e pelo hub_user_id (`docs/integracao-hub/casa360.md:89-105`). Por isso, no próximo login vindo da conta B, ele vai receber um e-mail e um hub_user_id novos. Ele pode então criar outro usuário local, sem os dados de hoje. Não verifiquei isso no código real do Casa360.
- Para não acontecer, a equipe do Casa360 troca, no registro em `hub_accounts` do usuário atual, o `hub_user_id` para f654ced0-… e o `email` para lbruttin@xfts.com.br. Isso deve ser feito logo após o passo 2. Eu entrego esse script pronto.
- Até essa troca, evite entrar no Casa360 pela conta B.

## Como reverter
- Hub: devolver o `user_id` e o `owner_user_id` a partir do backup, numa transação inversa, também auditada.
- Casa360: voltar o `hub_user_id` e o `email` para os valores da conta A.

A conta A não é desativada neste passo.
