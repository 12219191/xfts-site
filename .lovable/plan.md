# Alterações da Isabela no blog não são salvas

## O que está acontecendo

A conta `isabela.fernanda.buosi@gmail.com` tem o papel **superadmin** na tabela nova de papéis, e por isso ela entra no Control Center normalmente.

Mas a regra de segurança do blog não olha essa tabela: ela usa uma verificação antiga que só reconhece quem está na lista legada de administradores — e a Isabela não está nela. Resultado: a gravação simplesmente não encontra nenhuma linha para alterar, o banco não devolve erro, e a tela mostra "Artigo atualizado" mesmo sem salvar nada. Criar artigo novo dá erro de permissão.

O mesmo vale para as fotos do blog: as regras do repositório de imagens também usam só a lista legada, então o envio de imagem falha para ela.

Isso afeta qualquer administrador cadastrado apenas no sistema novo de papéis — não é específico da Isabela.

## Correção

1. Fazer a verificação de administrador reconhecer os dois cadastros: a lista legada **e** os papéis novos com permissão de conteúdo (superadmin e produto).
2. Aplicar a mesma verificação nas regras das imagens do blog.
3. Conferir, consultando como usuário logado, que a Isabela passa a poder criar, editar, publicar e excluir artigos e enviar imagens.
4. Deixar a tela de blog avisar quando uma edição não alterou nenhum artigo, em vez de exibir sucesso silencioso.

Nada muda em planos, assinaturas, pagamentos ou nos papéis já cadastrados.

## Detalhes técnicos

- Migração: redefinir `private.is_admin(_user_id uuid)` (security definer) como `admin_users` OR `EXISTS (select 1 from public.admin_roles where user_id=_user_id and role in ('superadmin','produto'))`, mantendo a checagem `_user_id = auth.uid()`. As políticas de `public.blog_articles` (INSERT/UPDATE/DELETE/SELECT) já chamam essa função e não precisam ser recriadas.
- Migração: recriar as 4 políticas de `storage.objects` do bucket `blog-images` trocando o `EXISTS (... admin_users ...)` por `private.is_admin(auth.uid())`.
- Verificado: `authenticated` já tem EXECUTE em `private.is_admin` e INSERT/UPDATE em `blog_articles`; a Isabela é `cc38abb9-…` com `admin_roles = {superadmin}` e `admin_users = false`.
- `src/components/admin/BlogPanel.tsx`: em `handleSave`/`togglePublished`, usar `.select("id")` no update e alertar quando o retorno vier vazio (0 linhas afetadas), para não exibir sucesso falso.
