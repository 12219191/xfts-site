# Recuperação de senha no novo fluxo de acesso

Revisei `/login` (modo "Esqueci minha senha") e `/reset-password`. O mecanismo funciona: envia o e-mail com `redirectTo` para `/reset-password`, e a página aceita os três formatos de link (hash com tokens, `?code=`, `?token_hash=`). Mas ele foi escrito antes da política de entrada pelo hub e tem quatro lacunas.

## Lacunas encontradas

1. **Perde o sistema de origem.** Quem chega de `xfts-flexus6/7/8` em `/login?app=barbearia` e clica em "Esqueci minha senha" volta, depois de redefinir, sempre para `/minha-conta`. O contexto `app`/`redirect` não é levado no link do e-mail, então o usuário não é devolvido ao sistema por SSO.
2. **Link expirado parece link quebrado.** Quando o e-mail volta com `error=access_denied` / `otp_expired`, a página mostra apenas "Link inválido", sem explicar o motivo nem oferecer reenvio — o usuário precisa refazer o caminho todo.
3. **Sessão comum é confundida com recuperação.** A página trata qualquer sessão ativa como recuperação válida; alguém já logado que abrir `/reset-password` sem link entra direto no formulário. Deve exigir o evento/`type=recovery`.
4. **Equipe importada não tem senha.** Os usuários trazidos dos sistemas no import em massa foram criados sem senha; a única porta deles hoje é "Esqueci minha senha", mas nada na tela diz isso — o texto atual sugere que a conta já teria uma senha.

Além disso, a tela de login do hub ainda oferece "Criar conta". No hub isso é legítimo (é onde nasce a assinatura), então mantenho — a remoção de autocadastro vale só para os sistemas.

## O que vou ajustar

- **Levar o contexto no link:** o e-mail passa a apontar para `/reset-password?app=<key>&redirect=<caminho>` (validado igual ao `/login`: só caminhos internos e chaves conhecidas). Depois de salvar a nova senha, o usuário é levado ao sistema por SSO quando veio de um; senão, para `/minha-conta`.
- **Estado de link expirado:** detectar `error`/`error_code` na URL e mostrar mensagem específica ("o link expirou") com campo de e-mail e botão "Enviar novo link", reenviando já com o mesmo `app`/`redirect`.
- **Exigir recuperação real:** só liberar o formulário no evento `PASSWORD_RECOVERY` ou com `type=recovery` na URL; sessão comum sem link cai no estado inválido, com atalho para `/minha-conta`.
- **Texto de primeiro acesso:** no modo "Esqueci minha senha", incluir a linha "Primeiro acesso ou conta criada pela sua empresa? Use este mesmo link para definir sua senha." e, quando houver `app`, mostrar de qual sistema veio.
- **Documentação:** acrescentar em `docs/integracao-hub/` (README + os três sistemas) que a recuperação do titular é sempre `https://xfts-flexus.com/login?app=<key>` → "Esqueci minha senha", e que a equipe usa a recuperação local do sistema.

## Detalhes técnicos

- `src/routes/login.tsx`: `handleForgotPassword` monta `redirectTo` com os parâmetros atuais de busca; nada muda no envio em si.
- `src/routes/reset-password.tsx`: ganha `validateSearch` (`app`, `redirect`, `error`, `error_code`), estados `checking | recovery | expired | invalid`, reenvio via `resetPasswordForEmail` e pós-salvamento reutilizando `createSsoLink` (mesma lógica de `goAfterAuth`).
- Sem alteração de schema, de Stripe, de chaves ou de configuração de e-mail. Se aparecer HTTP 429 no reenvio, é o limite horário de e-mails de autenticação — trato à parte, se ocorrer.

## Verificação

Fluxo ponta a ponta no preview: `/login?app=casa360` → esqueci a senha → link do e-mail → nova senha → abre Casa360° por SSO; e um segundo teste com link expirado para conferir a tela de reenvio.
