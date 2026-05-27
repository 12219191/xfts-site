## Objetivo

Aumentar e padronizar o tamanho da fonte das páginas `/termos-de-uso` e `/politica-de-privacidade` para acompanhar o padrão das demais páginas do site (ex: `produtos.gestao-clinica.tsx`, `contato.tsx`), onde corpo de texto usa `text-base`/`text-lg` em vez do tamanho pequeno atual.

## Diagnóstico

Em `src/components/LegalPageLayout.tsx`:
- Intro: `prose prose-slate` (renderiza ~14px, menor que o resto do site)
- Parágrafos das seções: sem classe explícita (cai no default do navegador, ~16px sem leading harmonioso)
- Listas: sem tamanho explícito
- TOC lateral: `text-sm` (ok, mantém)

O restante do site usa `text-base` (16px) para corpo e `text-lg` (18px) para subtítulos/intros, com `leading-relaxed`.

## Alterações (somente `src/components/LegalPageLayout.tsx`)

1. **Intro card**: remover `prose prose-slate` e aplicar diretamente `text-base md:text-lg leading-relaxed text-foreground/80` para ficar legível e proporcional ao hero.

2. **Conteúdo das seções**: trocar o wrapper `space-y-4 text-foreground/80 leading-relaxed` para `space-y-4 text-base md:text-[17px] leading-relaxed text-foreground/80`, garantindo corpo confortável em desktop.

3. **Listas (`<ul>`)**: como o conteúdo é passado pelas páginas (`politica-de-privacidade.tsx` e `termos-de-uso.tsx`), o tamanho herda do wrapper acima — nenhuma mudança necessária nos arquivos das rotas.

4. **Subtítulo do hero**: subir de `text-lg` para `text-lg md:text-xl` para acompanhar o título maior.

5. **Títulos das seções**: manter `text-2xl md:text-3xl` (já alinhado ao padrão).

6. **Contact card**: aumentar parágrafo de descrição para `text-base` (estava no default) e título para `text-2xl`.

## Fora de escopo

- Não alterar as rotas `termos-de-uso.tsx` nem `politica-de-privacidade.tsx` (apenas o layout compartilhado).
- Não mexer em cores, espaçamento, ícones, sidebar TOC, breadcrumb, botão "voltar ao topo" nem em SEO/metadados.
- Sem mudanças no Footer, sitemap ou rotas.