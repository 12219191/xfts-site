## Objetivo

Transformar `/politica-de-privacidade` e `/termos-de-uso` em páginas de documento puro, focadas em leitura e consulta — sem hero chamativo, sem cards grandes, sem sidebar pesado. Fonte menor, espaçamento contido.

## Alterações em `src/components/LegalPageLayout.tsx`

### Hero — versão enxuta
- Remover gradiente colorido, ícone grande e badge destacado.
- Substituir por um cabeçalho simples sobre `bg-muted/30`:
  - Breadcrumb pequeno (`text-xs`).
  - Título `text-2xl md:text-3xl font-bold` (antes `text-4xl md:text-6xl`).
  - Subtítulo `text-sm text-muted-foreground` (1 linha curta).
  - Linha "Última atualização" em `text-xs text-muted-foreground`.

### Layout principal
- Manter grid com sidebar TOC, mas mais compacta:
  - Sidebar: `text-xs`, sem card destacado — apenas borda fina à esquerda.
  - Conteúdo principal: largura máxima `max-w-3xl`.

### Tipografia do conteúdo (foco da mudança)
- Intro: remover card com borda primária. Virar parágrafo simples `text-sm leading-relaxed text-foreground/80`.
- Seções: remover cards com `border`, `shadow`, `hover:shadow`, padding grande. Virar blocos separados apenas por espaçamento vertical (`space-y-8`) e divisor sutil.
  - Número da seção: `text-sm font-semibold text-primary` inline (não mais `text-4xl`).
  - Título da seção (`h2`): `text-base md:text-lg font-semibold` (antes `text-2xl md:text-3xl`).
  - Corpo: `text-sm leading-relaxed text-foreground/80` (antes `text-base md:text-[17px]`).
  - Listas: `text-sm`, espaçamento reduzido (`space-y-1`).

### Card de contato
- Remover gradiente e grid de 3 colunas grandes.
- Substituir por bloco discreto ao final: `border-t` + parágrafo `text-xs text-muted-foreground` com CNPJ, e-mail e site em uma linha.

### Botão "Voltar ao topo"
- Manter, mas menor (`h-10 w-10`) e mais discreto.

## Arquivos afetados

- `src/components/LegalPageLayout.tsx` — única alteração.
- Rotas `politica-de-privacidade.tsx` e `termos-de-uso.tsx` permanecem inalteradas (a API do componente — props `badge`, `title`, `subtitle`, `sections`, `intro` — continua a mesma; `badge` e `icon` ficam aceitos mas não renderizados, evitando quebrar tipos).

## Não muda

- Conteúdo dos textos.
- SEO / metadata das rotas.
- Footer, sitemap, rotas.
- Design tokens globais.
