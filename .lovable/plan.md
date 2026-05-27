Criar página dedicada para os Termos de Uso.

**1. Nova rota `src/routes/termos-de-uso.tsx`**
- `createFileRoute('/termos-de-uso')` com `head()` contendo title, meta description (<160 chars) e canonical.
- H1 "Termos de Uso" + data de última atualização (27 de maio de 2026).
- 15 seções H2 com o conteúdo integral fornecido pelo usuário, usando `<ul>` para listas de obrigações/responsabilidades.
- Layout consistente com o restante do site (container, tipografia legível usando tokens do design system).

**2. `src/components/Footer.tsx`**
- Trocar o link "Termos de Uso" (atualmente `to="/"`) por `to="/termos-de-uso"`.

**3. `src/routes/sitemap[.]xml.tsx`**
- Adicionar entrada para `/termos-de-uso` (priority 0.3, changefreq yearly).

O conteúdo dos termos será inserido integralmente, preservando CNPJ, e-mail (xfts@xfts.com.br) e foro (São José do Rio Preto/SP).