# Prompt pronto para colar no FLEXUS | Casa360°

Nada muda neste projeto (hub). Abaixo está o texto para copiar e colar no chat do projeto Casa360°.
Depois do texto, cole o conteúdo completo de `docs/integracao-hub/casa360.md` no lugar indicado.

## Prompt

```text
Este projeto é o sistema FLEXUS | Casa360°, controlado pelo hub xfts-flexus.com
(assinaturas, planos, titularidade e cobrança vivem lá). Implemente exatamente o
contrato do documento no final desta mensagem, sem inventar endpoints nem renomear
campos.

Stack: TanStack Start — use rotas nativas do próprio app, não Edge Functions.

O que fazer:

1. Migração `public.hub_accounts` exatamente como no documento (colunas, índice,
   GRANTs para authenticated/service_role, RLS habilitada e a policy de leitura
   do próprio vínculo). GRANTs na mesma migração.
2. `src/lib/hub.server.ts` com `verifyHubToken`, `hmacBase64Url` e `safeEqual`
   (comparação em tempo constante), usando o segredo `FLEXUS_APP_KEY_CASA360`.
3. `src/lib/hub-sso.functions.ts` com o server function `trocarTokenHub`:
   troca o token no hub, bloqueia se `ativo !== true`, procura o usuário local
   PELO E-MAIL (vincula se existir, cria se não existir — nunca duplica),
   faz upsert em `hub_accounts` por `hub_user_id` e devolve o `token_hash` do magic link.
4. `src/routes/sso.tsx` (rota pública, `ssr: false`): lê `?token=`, chama
   `trocarTokenHub`, cria a sessão com `verifyOtp` e redireciona para `/`.
   Em erro, mostra tela curta com link para https://xfts-flexus.com/minha-conta.
5. `src/routes/api/public/provision.ts`: valida `x-flexus-signature`
   (HMAC-SHA256 base64url do corpo cru com `FLEXUS_APP_KEY_CASA360`), rejeita
   timestamp com mais de 5 minutos, responde SEMPRE JSON. Eventos:
   `created`/`updated` liberam e atualizam plano e `limite_usuarios`;
   `canceled`/`payment_failed` bloqueiam mantendo `acesso_ate` quando ainda houver
   período pago. Trate também o evento de teste `event: "ping"` com `dry_run: true`,
   respondendo `{"ok":true,"pong":true}` sem gravar nada.
6. Bloqueio total: no layout autenticado, carregar `hub_accounts` do usuário;
   se `ativo === false`, tela de bloqueio + signOut + link para o hub.
7. Assentos: convite de membros recusado acima de `limite_usuarios`
   (`null` = ilimitado). Para Casa360° o limite conta moradores.
8. Nova política de entrada no login: REMOVER o autocadastro (UI e backend,
   inclusive o `signUp` público). A tela de login deve ter três blocos:
   - "Entrar pelo hub" (botão primário, titular):
     https://xfts-flexus.com/login?redirect=%2Fminha-conta&app=casa360
   - "Entrar como equipe" (e-mail e senha local, SEM link de criar conta)
   - "Quero assinar" (link para https://xfts-flexus.com/produtos/flexus-casa360)
   Criação de usuário só por service role, no fluxo /sso e no aceite de convite.
   Recuperação de senha local continua para a equipe.

Cadastre o segredo `FLEXUS_APP_KEY_CASA360` com o valor que eu vou colar em seguida.

Documento de integração (siga como está):

<COLE AQUI O CONTEÚDO DE docs/integracao-hub/casa360.md>
```

## Depois de colar

1. Cadastrar no projeto Casa360° o segredo `FLEXUS_APP_KEY_CASA360` com o mesmo valor já
   configurado aqui no hub.
2. Publicar o Casa360° (o endpoint `https://xfts-flexus8.com/api/public/provision` precisa
   estar no ar).
3. Validar em `/admin` deste hub, em "Teste de conexão · casa360" — esperado 2xx JSON
   (`{"ok":true,"pong":true}`).
4. Teste ponta a ponta a partir de `/minha-conta`: "Abrir sistema" deve cair na conta
   existente pelo e-mail, e o mesmo link não pode funcionar duas vezes.
