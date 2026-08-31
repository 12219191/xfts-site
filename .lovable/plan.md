# Transferir a propriedade do projeto

Esta é uma mudança de configuração feita na interface do Lovable — não exige nenhuma alteração de código no site.

## Passo a passo

1. Convide o novo dono para o workspace
   - Workspace settings → Access → People → convidar o e-mail dele
   - Defina o papel como Admin (necessário para receber a propriedade)
   - Ele precisa aceitar o convite antes do próximo passo

2. Transfira o projeto
   - Abra Project settings → seção Project → General
   - Clique em "Transfer ownership" e escolha a conta do novo dono
   - Confirme a transferência

3. Ajustes após a transferência
   - Billing e créditos não são transferidos: o novo dono precisa ter plano/créditos próprios
   - Se quiser continuar editando, peça para ele te manter como Admin/Editor no workspace
   - Se o projeto usar um Supabase externo (não é o caso aqui — usamos Lovable Cloud), seria preciso desconectar antes

## Pontos de atenção para este projeto

- Domínio: xfts-flexus.com e www.xfts-flexus.com continuam apontando para o projeto; nada de DNS precisa mudar, mas a gestão de domínio passa para o novo dono.
- Integrações de workspace (Stripe, Google Search Console, Zapier) são conexões de workspace: se o projeto for para outro workspace/conta, elas precisam ser reconectadas pelo novo dono.
- Segredos do backend (chaves Stripe, HMAC do CRM, etc.) permanecem no projeto, mas vale revisar quem tem acesso após a troca.

## O que eu posso fazer no build

Nada é obrigatório no código. Se quiser, na aprovação eu posso:
- Listar todas as conexões/segredos atuais que precisarão ser reconfirmados pelo novo dono
- Documentar tudo isso em um arquivo de handover no repositório (ex.: `docs/handover-propriedade.md`)
