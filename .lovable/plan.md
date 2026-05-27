## Melhorias de UI: /termos-de-uso e /politica-de-privacidade

Atualmente as duas páginas são paredes de texto numa única coluna. Vou elevar o nível visual mantendo todo o conteúdo intacto.

### Mudanças

1. **Hero refinado**
   - Hero mais elegante com gradiente sutil, badge (ex: "Documento legal"), título grande, subtítulo e data de atualização com ícone de calendário.
   - Breadcrumb (Início › Termos / Política).

2. **Layout de duas colunas (desktop)**
   - Sidebar fixa (sticky) à esquerda com **índice/sumário** clicável (anchor links para cada seção numerada). Em mobile vira um card colapsável no topo.
   - Coluna principal à direita com o conteúdo.

3. **Tipografia e leitura**
   - Largura de leitura confortável (`max-w-prose`), espaçamento generoso entre seções.
   - Cada seção vira um "bloco" com número grande estilizado (ex: "01", "02") em cor accent, separador sutil entre seções.
   - H2 com hierarquia clara, listas com bullets customizados (ícones check / dot em cor primária).

4. **Componentes visuais**
   - Card de contato final destacado com ícones (Mail, Globe, Building) usando lucide-react.
   - Botão "Voltar ao topo" flutuante.
   - Card de aviso/destaque no topo do conteúdo ("Leia com atenção...").

5. **Consistência**
   - Mesmas melhorias aplicadas idênticas às duas páginas (Termos e Política), usando tokens do design system (`text-primary`, `bg-card`, `border-border`, etc.) — sem cores hardcoded.

### Arquivos

- `src/routes/termos-de-uso.tsx` — refator de UI (conteúdo preservado).
- `src/routes/politica-de-privacidade.tsx` — mesmo tratamento.
- Opcional: extrair `<LegalPageLayout>` em `src/components/LegalPageLayout.tsx` para evitar duplicação (hero + sidebar + wrapper); páginas passam só título, data, sumário e seções.

Sem mudanças em backend, rotas, sitemap ou Footer.
