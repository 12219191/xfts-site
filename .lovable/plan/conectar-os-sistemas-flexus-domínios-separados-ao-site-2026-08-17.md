# Conectar os sistemas FLEXUS (domínios separados) ao site

Hoje o site vende os planos, mas os sistemas rodam em domínios próprios:

- FLEXUS | Barbearia — xfts-flexus6.com
- FLEXUS | CRM — xfts-flexus7.com
- FLEXUS | Casa360° — xfts-flexus8.com
- Clínica, Estética e ABA — ainda sem domínio (ficam como "em breve")

## Arquitetura recomendada

Este site vira o **hub central**: é aqui que o cliente cria a conta, paga e é reconhecido. Cada sistema continua com o seu domínio e seus dados, mas **não tem login próprio** — ele pergunta ao hub quem é o usuário e o que ele pode acessar.

```text
  Cliente
    │  compra e faz login
    ▼
  xfts-flexus.com  (hub: conta + assinatura + acesso)
    │  link assinado, válido por ~2 min
    ▼
  xfts-flexus6/7/8.com  (sistema valida o link no hub e cria a sessão local)
```

Vantagens: uma conta só, uma cobrança só, e o bloqueio por falta de pagamento passa a valer automaticamente em todos os sistemas.

## O que será feito neste site

1. **Mapa de produtos → domínio**: cada produto passa a saber para qual URL enviar o cliente (os três existentes; os outros três marcados como "em breve").
2. **Botão "Acessar Sistema" inteligente**: em vez de ir para /login genérico, leva o cliente logado direto ao sistema do produto que ele assinou; sem login, manda para /login e volta; sem assinatura, mostra a oferta do plano.
3. **Minha Conta com "Meus sistemas"**: cartão para cada sistema assinado, com status (ativo, cancelado, pagamento pendente) e botão de acesso; sistemas não assinados aparecem como oferta.
4. **Login único (SSO)**: ao clicar em acessar, o hub gera um token de uso único e curta duração e redireciona para o sistema já autenticado — sem digitar senha de novo.
5. **Endpoint de verificação para os sistemas**: os sistemas consultam o hub para (a) trocar o token pelo usuário e (b) checar a qualquer momento se a assinatura ainda está ativa.
6. **Provisionamento pós-compra**: ao confirmar o pagamento, o hub avisa o sistema correspondente para criar/liberar a conta do cliente; ao cancelar ou falhar o pagamento, avisa também para bloquear.

## Detalhes técnicos

- `src/lib/flexus-apps.ts`: catálogo (chave do produto, nome, domínio, `product_id`/`price_id` correspondentes, flag `disponivel`).
- SSO: `POST /api/public/sso/token` (autenticado pelo bearer do usuário) devolve um JWT curto (2 min, uso único) assinado com o segredo `FLEXUS_SSO_SECRET`; redireciona para `https://<dominio>/sso?token=...`.
- Verificação: `POST /api/public/sso/verify` — o sistema envia o token + sua `FLEXUS_APP_KEY`; o hub valida assinatura, expiração e assinatura ativa (`has_active_subscription`) e devolve `{ user_id, email, produto, plano, status, expira_em }`.
- Estado: `GET /api/public/entitlements` (com `FLEXUS_APP_KEY`) para o sistema revalidar acesso periodicamente.
- Provisionamento: no webhook de pagamento já existente (`src/routes/api/public/payments/webhook.ts`), após atualizar `subscriptions`, disparar um POST assinado (HMAC) para `https://<dominio>/api/provision` com evento (`created`, `updated`, `canceled`, `payment_failed`), usuário e plano. Falhas ficam registradas em `subscription_events` para retry.
- Segredos necessários: `FLEXUS_SSO_SECRET` e uma chave por app (`FLEXUS_APP_KEY_BARBEARIA`, `_CRM`, `_CASA360`).
- UI: novo componente `MeusSistemas` usado em `/minha-conta`, e `useAppAccess` para decidir o comportamento do botão "Acessar Sistema" nas landings.

## Do lado dos sistemas (xfts-flexus6/7/8)

Cada sistema precisa de duas rotas simples: `/sso` (recebe o token, chama `verify`, cria a sessão local) e `/api/provision` (recebe o webhook do hub e cria/bloqueia a conta). Se esses sistemas também forem projetos Lovable, posso implementá-las lá em seguida — este plano cobre o lado do hub e a especificação exata que os sistemas devem seguir.
