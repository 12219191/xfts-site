# FLEXUS | CRM — implementação do lado do sistema

Stack: Vite SPA (`src/pages`, react-router) + funções de backend Supabase — igual ao Barbearia.

Segredo necessário no projeto CRM: `FLEXUS_APP_KEY_CRM`.

A implementação é idêntica à de [Barbearia](./barbearia.md), com três trocas:

1. `Deno.env.get("FLEXUS_APP_KEY_BARBEARIA")` → `Deno.env.get("FLEXUS_APP_KEY_CRM")`
   nas duas funções (`flexus-sso` e `flexus-provision`).
2. A página de SSO entra em `src/pages/Sso.tsx` e a rota `/sso` é registrada em
   `src/App.tsx` (pública, fora do guard de autenticação); após a sessão, redirecionar
   para o dashboard do CRM (`/` ou `/leads`, conforme a rota inicial atual).
3. O vínculo do titular precisa considerar o modelo multi-tenant do CRM: ao criar um
   usuário novo, criar também o tenant e o papel de `owner`; ao encontrar um usuário
   existente pelo e-mail, apenas gravar `hub_user_id`, `plano` e `limite_usuarios`
   no `hub_accounts` e manter o tenant atual.

Resumo dos artefatos:

- Migração `public.hub_accounts` (mesma SQL do Barbearia, com GRANTs e RLS).
- `supabase/functions/flexus-sso/index.ts` — troca o token no hub, casa o usuário por
  e-mail, devolve `token_hash` de magic link.
- `supabase/functions/flexus-provision/index.ts` — valida HMAC, aplica evento.
- `supabase/config.toml`: `verify_jwt = false` para as duas funções.
- Guard: `ativo === false` → bloqueio total com link para `https://xfts-flexus.com/minha-conta`.
- Convite de membros (`MembersSettings`): respeitar `limite_usuarios` do hub.

Endpoint de provisionamento já configurado no hub:
`https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-provision`
