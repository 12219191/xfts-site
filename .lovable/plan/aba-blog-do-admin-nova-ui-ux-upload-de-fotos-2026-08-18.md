# Aba Blog do Admin: nova UI/UX + upload de fotos

Hoje a aba Blog mostra uma tabela simples (título, categoria, status, data) e, na hora de criar/editar, exige colar a URL da imagem manualmente. A proposta é tornar a gestão de artigos visual e permitir subir a foto direto do computador.

## 1. Upload de imagens (fim da URL manual)

Hoje não existe nenhum espaço de arquivos configurado no backend, então será criado um:

- Novo repositório público de imagens do blog (`blog-images`), leitura liberada para o site e escrita apenas para administradores.
- No formulário de artigo: área de arrastar-e-soltar / clicar para escolher a imagem, com barra de progresso e miniatura logo após o envio.
- Validação: apenas imagens (JPG, PNG, WebP), limite de 5 MB, nome de arquivo gerado automaticamente.
- Botão "Remover imagem" e, para quem já tem link pronto, um campo opcional "usar URL externa" recolhido.
- Artigos existentes continuam funcionando (as URLs atuais permanecem válidas).

## 2. Ver todos os artigos com clareza

- Barra de busca por título/resumo e filtros por status (Todos / Publicados / Rascunhos) e categoria.
- Miniatura da imagem em cada linha da tabela, com aviso visual quando o artigo está sem foto.
- Coluna de resumo curto e link "ver no site" para artigos publicados.
- Alternar publicado/rascunho direto na lista, sem abrir o artigo.
- Ordenação por data e contagem "X de Y artigos"; paginação simples quando passar de 20 itens.
- Alternância entre visualização em tabela e em cartões (grade com capa), útil para conferir as imagens.
- Estados de carregando (esqueleto) e vazio com chamada para criar o primeiro artigo.

## 3. Editor mais confortável

- Modal maior, dividido em duas colunas: conteúdo à esquerda, publicação/imagem/metadados à direita.
- Contador de caracteres no resumo (aviso acima de 160, por causa do SEO) e no título.
- Slug editável com aviso de duplicidade antes de salvar.
- Pré-visualização da capa e do cabeçalho do artigo.
- Feedback de sucesso/erro ao salvar e excluir (hoje é silencioso), e confirmação de exclusão em diálogo padrão em vez do alerta do navegador.

## Detalhes técnicos

- Migração: criar bucket `blog-images` público + políticas de storage (INSERT/UPDATE/DELETE restritos a usuários presentes em `admin_users`, SELECT público).
- `src/routes/admin.tsx`: extrair a aba Blog para `src/components/admin/BlogPanel.tsx` (lista, filtros, tabela/grade) e `src/components/admin/ArticleEditorDialog.tsx` (modal), mantendo o arquivo da rota enxuto.
- Novo `src/components/admin/ImageUploader.tsx` usando `supabase.storage.from("blog-images").upload()` e `getPublicUrl()`, alimentando `form.image_url`.
- Usar `sonner` para toasts e o `AlertDialog` do shadcn para exclusão.
- Nenhuma mudança no site público nem no schema de `blog_articles`.
