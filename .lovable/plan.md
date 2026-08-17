# Implementar o lado dos sistemas (Barbearia, CRM, Casa360°)

Como os três sistemas também são projetos Lovable, eu abro cada projeto e implemento lá as duas rotas que faltam, seguindo exatamente o contrato que o hub (xfts-flexus.com) já usa hoje.

## O que cada sistema vai ganhar

1. **/sso** — recebe `?token=...`, chama o hub em `POST https://xfts-flexus.com/api/public/sso/verify` com a chave do próprio sistema, e cria a sessão local do titular.
2. **/api/provision** — recebe o webhook assinado do hub (HMAC), valida a assinatura e libera ou bloqueia a conta conforme o evento (`created`, `updated`, `canceled`, `payment_failed`).
3. **Bloqueio total** — se a assinatura não estiver ativa, o sistema não deixa entrar: mostra uma tela curta e manda o usuário para `https://xfts-flexus.com/minha-conta`.

## Vinculação com as contas que já existem

O hub envia o **e-mail** do titular. O sistema procura o usuário local por esse e-mail:

- Existe (seu caso hoje) → vincula e cria a sessão nessa conta, sem duplicar nada.
- Não existe → cria a conta na hora, já no plano certo.

Nos dois casos o sistema guarda `hub_user_id`, plano e limite de usuários, para as próximas entradas serem por ID e não só por e-mail.

```text
  xfts-flexus.com/minha-conta
        │ "Abrir sistema"  (token, 2 min, uso único)
        ▼
  xfts-flexus6.com/sso ──► hub /api/public/sso/verify ──► { email, plano, limite_usuarios, ativo }
        │ acha o usuário pelo e-mail e cria a sessão
        ▼
  sistema liberado no plano certo
```

## Detalhes técnicos (por projeto)

Tabela `hub_accounts` (ou colunas equivalentes no perfil existente): `hub_user_id`, `email`, `plano`, `limite_usuarios`, `status`, `acesso_ate`, `atualizado_em`. GRANTs + RLS na mesma migração; escrita só por service role.

`src/routes/sso.tsx` (ou `/api/sso` conforme o stack do projeto):
- Lê o token, faz `POST` ao hub com header `x-flexus-app-key: FLEXUS_APP_KEY_<APP>`.
- Rejeita se `ativo !== true` → tela de bloqueio com link para o hub.
- Faz upsert em `hub_accounts` por e-mail e cria a sessão do usuário via Admin API (busca por e-mail; cria se não existir) + magic link/`setSession`.
- Token expirado ou reutilizado → mensagem clara e botão "voltar ao hub".

`src/routes/api/public/provision.ts`:
- Lê o corpo cru, recalcula HMAC-SHA256 base64url com `FLEXUS_APP_KEY_<APP>` e compara em tempo constante com `x-flexus-signature` (mesmo algoritmo de `signBody` no hub).
- Sempre responde **JSON** (o hub trata HTML de SPA como falha).
- `created`/`updated` → upsert do plano e `limite_usuarios`; `canceled`/`payment_failed` → marca bloqueado (mantendo `acesso_ate` quando houver período pago restante).
- Rejeita timestamp com mais de 5 minutos (anti-replay).

Aplicação do limite de assentos: contagem de usuários ativos do sistema comparada a `limite_usuarios` (null = ilimitado) no convite de equipe.

Segredos por projeto: `FLEXUS_APP_KEY_BARBEARIA` / `_CRM` / `_CASA360` — os mesmos valores já configurados no hub.

## Ordem de execução

1. FLEXUS | Barbearia (piloto completo, ida e volta testada com o hub).
2. FLEXUS | CRM e FLEXUS | Casa360° com o mesmo padrão.
3. Teste ponta a ponta a partir de `/minha-conta`: abrir os três sistemas, confirmar que caiu na sua conta existente, e repetir o link para confirmar o uso único.

Nada muda neste projeto (hub) — o contrato atual já atende.
