Criar página de Política de Privacidade no mesmo padrão dos Termos de Uso.

**1. `src/routes/politica-de-privacidade.tsx`**
- `createFileRoute('/politica-de-privacidade')` com `head()` (title, meta description <160 chars, og tags, canonical relativo).
- Hero com H1 "Política de Privacidade" + data de atualização.
- 13 seções H2 com o conteúdo integral, listas em `<ul>` onde aplicável, card de contato no final.

**2. `src/components/Footer.tsx`**
- Trocar `<Link to="/">Política de Privacidade</Link>` por `to="/politica-de-privacidade"`.

**3. `src/routes/sitemap[.]xml.tsx`**
- Adicionar `/politica-de-privacidade` (priority 0.3, changefreq yearly).