# Acesso da Isabela ao Control Center

## O que está acontecendo

A conta `isabela.fernanda.buosi@gmail.com` já existe, está confirmada e tem o papel **superadmin**. Ela entrou hoje às 12:28 (horário de Brasília). Duas coisas explicam a sensação de "não deixa acessar":

1. A conta foi criada **pelo Google** — nunca teve senha. Qualquer tela que peça e-mail e senha vai recusar.
2. A tela de entrada do Control Center (`/admin`) só oferece e-mail e senha, **sem o botão "Continuar com Google"**. Então quem entrou pelo Google não tem por onde passar ali.

## O que ela deve fazer agora (sem esperar mudança de código)

- Entrar em `xfts-flexus.com/login`, clicar em **Continuar com Google** e escolher a conta Gmail dela. Depois abrir `xfts-flexus.com/admin`, que reconhece a sessão.
- Se ela preferir ter senha própria: em `/login`, clicar em **Esqueceu a senha?**, informar o e-mail e usar o link que chega por e-mail para definir a senha. A partir daí funciona nas duas formas.
- Não existe lugar onde você cria a senha dela por ela — a senha é sempre definida pela própria pessoa através desse link. Você apenas concede o papel em Equipe (já feito).

## O que mudar no site

1. **Botão do Google na entrada do Control Center**: incluir "Continuar com Google" na tela de login de `/admin`, igual à do site, para que contas Google entrem direto.
2. **Link "Esqueceu a senha? / primeiro acesso"** nessa mesma tela, levando ao fluxo de recuperação já existente.
3. **Mensagem mais clara** quando o e-mail e a senha não conferem porque a conta é do Google: em vez de só "credenciais inválidas", orientar a usar o Google ou definir uma senha.
4. **Aviso na tela de Equipe** ao conceder um papel: lembrar que a pessoa entra com o mesmo e-mail pelo Google ou definindo a senha pelo link de recuperação — evita a dúvida de "onde ela se cadastra".

## Detalhes técnicos

- `src/routes/admin.tsx`: reaproveitar o componente de login social (`lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/admin" })`) e um atalho para `/login?redirect=%2Fadmin` no modo recuperação; sem mudança na verificação de papéis (`getAdminSession` continua igual).
- Nenhuma alteração de banco, de papéis ou de chaves. A conta em questão já tem `admin_roles.role = superadmin`.
