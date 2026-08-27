# O que colar em cada sistema (além do documento)

Sim: o documento é o contrato técnico, mas ele não diz ao agente do outro projeto **o que fazer**. Cole o documento do sistema (`docs/integracao-hub/barbearia.md`, `crm.md` ou `casa360.md`) **junto com um prompt curto de instrução**. Nada precisa ser alterado neste projeto (hub) — a parte dele já está pronta.

## Prompt para Barbearia e CRM (SPA + funções de backend)

```text
Este projeto é o sistema FLEXUS | <Barbearia|CRM>, que passa a ser controlado pelo hub
xfts-flexus.com (assinaturas, planos e titularidade ficam lá).

Siga exatamente o documento abaixo e implemente:
1. A migração public.hub_accounts (com GRANTs e RLS).
2. As funções flexus-sso e flexus-provision (verify_jwt = false), incluindo o
   evento de teste "ping" com dry_run, respondendo {"ok":true,"pong":true}.
3. A rota pública /sso que cria a sessão a partir do token do hub.
4. Bloqueio total quando ativo === false, com link para
   https://xfts-flexus.com/minha-conta.
5. Nova política de entrada na tela de login: remover o autocadastro (UI e backend)
   e deixar três blocos — "Entrar pelo hub" (primário), "Entrar como equipe"
   (e-mail/senha, sem criar conta) e "Quero assinar" (link para o hub).
6. Convites de equipe respeitando limite_usuarios devolvido pelo hub.

Não invente endpoints nem mude nomes de campos: use o contrato como está.
O segredo FLEXUS_APP_KEY_<BARBEARIA|CRM> já existe/precisa ser cadastrado com o
valor que eu vou colar.

<COLE AQUI O CONTEÚDO DE docs/integracao-hub/<arquivo>.md>
```

## Prompt para Casa360° (TanStack Start)

Mesmo texto, trocando o item 2/3: rotas nativas `src/routes/sso.tsx` e
`src/routes/api/public/provision.ts`, e o segredo `FLEXUS_APP_KEY_CASA360`.

## Além do prompt, o que você precisa entregar ao outro projeto

- O valor da chave `FLEXUS_APP_KEY_<APP>` (cadastrar como segredo lá).
- Confirmar depois, no `/admin` do hub, o "Teste de conexão" de cada sistema
  (esperado: 2xx JSON = saudável).

## Ordem sugerida

1. Barbearia (piloto) → validar SSO real com uma conta titular.
2. CRM.
3. Casa360°.
