# O que muda nos sistemas depois do ajuste de recuperação de senha

Resposta curta: **nada obrigatório**. O que mudou (link com contexto, tela de link expirado, bloqueio de acesso sem link, texto de primeiro acesso) vive todo no hub. O contrato entre hub e sistemas — `/sso`, `sso/verify`, provisionamento, `entitlements` — não mudou, e as chaves `FLEXUS_APP_KEY_*` seguem válidas.

Só há um ajuste **opcional**, de uma linha por sistema, para o usuário não cair na recuperação errada.

## Ajuste opcional na tela de login de cada sistema

Hoje o bloco "Entrar como equipe" tem um "Esqueci minha senha" local. O titular, que não tem senha local, pode clicar nele e receber um e-mail que não resolve nada. A correção é separar os dois caminhos, no bloco já existente:

- No bloco **"Entrar pelo hub"**, junto ao botão, um link secundário:
  "Esqueci minha senha" → `https://xfts-flexus.com/login?app=<key>` (a mesma URL do botão principal; a tela do hub já oferece a recuperação).
- No bloco **"Entrar como equipe"**, manter o "Esqueci minha senha" local, com o rótulo explícito:
  "Esqueci minha senha (equipe)".
- Uma linha de apoio: "É o titular da assinatura? Recupere a senha pelo hub."

`<key>` = `barbearia` | `crm` | `casa360`.

## O que já está pronto do lado do hub

- `https://xfts-flexus.com/login?app=<key>` → "Esqueci minha senha" envia o link já com o sistema de origem.
- Depois de salvar a nova senha, o hub abre o sistema por SSO automaticamente — o usuário não precisa voltar sozinho.
- Link expirado mostra tela própria com reenvio, mantendo o sistema de origem.
- O mesmo fluxo serve como **primeiro acesso** das contas importadas (criadas sem senha).
- Isso já está documentado em `docs/integracao-hub/` (README + os três sistemas), na seção "Recuperação de senha".

## Se quiser que eu faça

Posso gerar o prompt pronto para colar em cada sistema (Barbearia, CRM, Casa360°) com o texto exato dos links e onde encaixá-los na tela de login. Nenhuma migração, chave ou endpoint novo é necessário.
