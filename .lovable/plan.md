# Trazer os usuários atuais dos sistemas para o Control Center

Hoje o hub tem só 4 contas (lbruttin@xfts.com.br, luciano.bruttin@gmail.com, isabela.fernanda.buosi@gmail.com, isabela@bruttin.com.br). Todos os demais e-mails da sua lista existem apenas dentro de cada sistema. A importação cria a conta no hub, registra a cortesia e vincula os não-admins como vagas do titular.

## Como cada perfil entra

- **Admin do sistema** → vira titular de uma cortesia Pro, validade de 365 dias, no sistema correspondente (Barbearia, Casa360 ou CRM).
- **Usuário comum** → não vira titular: entra como membro já aceito na conta do admin daquele sistema, ocupando uma vaga do plano.
- **Sem e-mail**: nenhum convite ou notificação é disparado. As contas são criadas silenciosamente e todos continuam entrando direto pelo sistema como hoje.

## As 5 contas a importar

São 5 contas (3 barbearias, 1 CRM, 1 Casa360). Cada titular recebe uma cortesia Pro do produto correspondente; as vagas entram como membros já aceitos na conta do titular.

```text
Barbearia · O Zé Barbearia → titular: jose_dias11@hotmail.com
   vagas: joaopedrosturchiodeoliveira@gmail.com, dondiegobarber07@gmail.com,
          isabela.fernanda.buosi@gmail.com, emanuelerondani311@gmail.com

Barbearia · Default        → titular: lbruttin@xfts.com.br
   vagas: mkt@bruttin.com.br, financeiro@xfts.com.br

Barbearia · Petunga        → titular: isabela@bruttin.com.br
   vagas: (nenhuma)

Casa360                    → titular: luciano.bruttin@gmail.com
   vagas: isabela.fernanda.buosi@gmail.com

CRM                        → titular: luciano.bruttin@gmail.com
   vagas: isabela.fernanda.buosi@gmail.com
```

Observações:
- O titular já ocupa uma vaga da própria conta, então não repito `lbruttin@xfts.com.br` na lista de vagas da Barbearia Default.
- `isabela.fernanda.buosi@gmail.com` aparece em três contas diferentes (O Zé, Casa360 e CRM) — é a mesma conta de usuário do hub, com um vínculo por conta.
- Se o Pro de alguma conta não comportar as vagas listadas, eu aumento o limite de assentos daquela cortesia (com motivo registrado em auditoria) em vez de deixar vínculos fora do limite.
- Nome da conta (O Zé, Default, Petunga) vai na nota da cortesia, para distinguir as três barbearias no `/admin/clientes`.

## O que eu executo

1. Criar a conta no hub para cada e-mail que ainda não existe (sem envio de e-mail).
2. Para cada titular: gravar a cortesia Pro de 365 dias no sistema correspondente, marcada como importação de base existente na nota.
3. Para cada usuário comum: gravar o vínculo de equipe já como aceito, na conta do titular do sistema, sem envio de convite.
4. Ajustar o limite de assentos da cortesia quando a equipe passar do limite do plano.
5. Registrar tudo na auditoria e no histórico do cliente, para a timeline mostrar de onde vieram.
6. Conferir no Control Center: `/admin/clientes` mostrando 3 titulares com produtos e vagas corretas, e `/admin/cortesias` listando as 3 cortesias com vencimento em 365 dias.

## Detalhes técnicos

- Contas: `auth.admin.createUser` com `email_confirm: true` e sem senha (fluxo silencioso), em vez do `inviteUserByEmail` usado hoje em `findOrInviteUser` — assim ninguém recebe e-mail; quem já existe é reaproveitado por e-mail.
- Cortesias: linhas em `public.subscriptions` no mesmo formato do `grantCourtesy` (`stripe_subscription_id` com prefixo `comp_`, `is_courtesy = true`, `price_id = <pricePrefix>_pro_mensal`, `environment` = live), mais evento `cortesia_concedida` em `subscription_events`.
- Vagas: linhas em `public.account_invites` com `status = 'accepted'`, `accepted_user_id` preenchido e `accepted_at = now()`, respeitando o índice único de convites por e-mail/app.
- Assentos: `subscriptions.seats_override` quando a equipe exceder o entitlement `usuarios` do plano.
- Provisionamento: não vou disparar `provisionApp` nesta carga, já que os usuários já existem e estão ativos dentro de cada sistema; a carga só espelha a base no hub. Se preferir sincronizar (enviar o payload de provisionamento para cada sistema), me diga e incluo esse passo.
- Execução via ferramenta de dados do backend, sem nenhuma tela nova nem alteração de código.
