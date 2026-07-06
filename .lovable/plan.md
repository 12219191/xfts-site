## Objetivo

Criar página `/exclusao-de-dados` no mesmo padrão visual de `/termos-de-uso` e `/politica-de-privacidade`, usando o componente `LegalPageLayout`.

## Arquivos

### Novo: `src/routes/exclusao-de-dados.tsx`
- `createFileRoute("/exclusao-de-dados")` com `head()` (title, description, og:*, canonical).
- Renderiza `LegalPageLayout` com:
  - `title`: "Exclusão de Dados do Usuário"
  - `subtitle`: frase curta sobre solicitar exclusão de dados pessoais.
  - `breadcrumbLabel`: "Exclusão de Dados"
  - `updatedAt`: "27 de maio de 2026" (mesmo padrão das outras)
  - `intro`: parágrafo introdutório sobre respeito à privacidade e o processo simples de exclusão.
  - `sections` (6 seções numeradas 01–06):
    1. Como solicitar a exclusão — canais (e-mail, formulário, sistema) + dados a informar (lista).
    2. Prazo de atendimento — até 15 dias úteis após confirmação de identidade.
    3. Dados que poderão ser mantidos — retenção por obrigação legal/contratual.
    4. Dados excluídos — lista (cadastrais, contato, histórico, conversas, demais).
    5. Contato — CNPJ, site, e-mail.
    6. (opcional) unificar contato no rodapé do layout, que já mostra CNPJ/e-mail/site — nesse caso 5 seções.

Decisão: usar **5 seções** (remover seção "Contato" duplicada, pois o `LegalPageLayout` já renderiza rodapé com CNPJ/e-mail/site).

### Editar: `src/components/Footer.tsx`
- Adicionar link "Exclusão de Dados" junto aos links de Termos e Política de Privacidade (verificar seção legal existente).

### Editar: `src/routes/sitemap[.]xml.tsx`
- Adicionar `{ path: "/exclusao-de-dados", priority: "0.3", changefreq: "yearly" }` na lista `staticRoutes`.

## Não muda

- `LegalPageLayout.tsx` — reuso puro.
- Design tokens, outras rotas legais.
