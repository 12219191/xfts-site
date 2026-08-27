# Entrada nos sistemas: fim do autocadastro, hub como única porta

Hoje Barbearia, CRM e Casa360° ainda mostram "entrar ou criar conta" — telas feitas antes do Control Center. Com a cobrança e a titularidade centralizadas em xfts-flexus.com, criar conta direto no sistema gera usuário sem assinatura, sem plano e sem assento: exatamente o caso que você viu com contas que existiam nos sistemas mas não no hub.

## Como deve funcionar

```text
  Titular (quem paga)          Equipe (barbeiro, recepção)
        │                              │
  xfts-flexus.com                convite do titular
  login + assinatura             dentro do sistema
        │ SSO (token 2 min)            │ senha local
        ▼                              ▼
      sistema FLEXUS ── acesso liberado enquanto o hub disser "ativo"
```

1. **Titular** entra só pelo hub. No sistema, o botão principal vira "Entrar pelo hub" → manda para `https://xfts-flexus.com/login?redirect=/minha-conta`.
2. **Equipe** continua com login local (e-mail + senha), mas **sem autocadastro**: só existe conta se o titular convidar. O formulário de "criar conta" sai das três telas.
3. **Visitante sem conta** vê CTA comercial: "Não tem acesso? Assine em xfts-flexus.com" apontando para a landing do produto.
4. **Recuperação de senha** local permanece para a equipe; para o titular, a recuperação é a do hub.
5. **Corte de acesso**: se o hub informa assinatura inativa (cancelada, inadimplente), sistema bloqueia titular e equipe juntos, com link para `/minha-conta`.

## O que muda em cada projeto de sistema

- Tela de login: remover aba/branch de cadastro e o `signUp` correspondente; três blocos — "Entrar pelo hub" (primário), "Entrar como equipe" (e-mail/senha), "Quero assinar" (link para o hub).
- Desativar cadastro no backend: sem confirmação automática e sem criação de usuário fora do fluxo de SSO/convite (criação apenas por service role, no `/sso` e no aceite de convite).
- Convite de equipe: continua no sistema, respeitando `limite_usuarios` que o hub já devolve em `sso/verify` e `entitlements`.
- Rota `/sso` e `/api/provision` já existem no contrato — nada muda nelas.

## O que muda neste projeto (hub)

- `docs/integracao-hub/`: novo trecho "Política de entrada" em `README.md`, `barbearia.md`, `crm.md` e `casa360.md` com o contrato acima e o texto exato dos botões (é essa documentação que você cola nos outros projetos).
- `src/routes/login.tsx`: aceitar `?app=barbearia|crm|casa360` para, após o login, levar direto ao sistema de origem em vez de `/minha-conta`.
- `/minha-conta`: reforçar no card de cada sistema que o acesso é sempre por ali ("Abrir sistema"), incluindo o caso de cortesia.

## Detalhes técnicos

- Link de volta do sistema para o hub: `https://xfts-flexus.com/login?redirect=%2Fminha-conta&app=<key>`; o hub valida `app` contra `FLEXUS_APPS` e ignora valores desconhecidos.
- Nenhuma alteração de schema, de Stripe ou de chaves; as `FLEXUS_APP_KEY_*` atuais seguem válidas.
- Sem impacto no portal do cliente final por token de WhatsApp (continua local ao sistema, fora do SSO).

## Ordem

1. Documentação do contrato no hub + ajuste de `?app=` no login (feito aqui).
2. Aplicar a nova tela de login na Barbearia como piloto, depois CRM e Casa360°.
