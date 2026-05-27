No rodapé (`src/components/Footer.tsx`), substituir o ícone/link de Telefone (que apontava para o WhatsApp) por um link do Facebook:

1. Substituir o import `Phone` por `Facebook` em `lucide-react`.
2. Atualizar o `<a>` correspondente:
   - `href="https://www.facebook.com/XFTSolucoes"`
   - `aria-label="Facebook"`
   - Renderizar `<Facebook className="..." />` no lugar de `<Phone />`
3. Manter `target="_blank"` e `rel="noopener noreferrer"`.