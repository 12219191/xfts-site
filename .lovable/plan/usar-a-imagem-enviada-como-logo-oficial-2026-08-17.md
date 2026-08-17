# Usar a imagem enviada como logo oficial

A imagem enviada é o lockup completo (símbolo de losangos + "XFTS / Inteligência Analítica") em off-white com o acento dourado. Ela substitui o logo desenhado em SVG que está hoje no site.

## O que muda

1. **Arquivo do logo**
   - A imagem vai para o CDN de assets e passa a ser referenciada por ponteiro, sem binário no repositório.

2. **Componente `Logo`**
   - `variant="full"` passa a renderizar a imagem inteira (símbolo + wordmark), em vez do símbolo SVG + texto montado em HTML. O `alt` continua "XFTS Inteligência Analítica".
   - `variant="mark"` continua existindo para espaços pequenos, recortando apenas a parte do símbolo.
   - Como a arte é off-white, ela fica perfeita em fundos escuros (rodapé, hero, gradientes). Em fundos claros (header, login, checkout, 404) o logo seria invisível, então nesses pontos aplico uma versão colorida da mesma arte em verde petróleo (recolorização via máscara CSS, mantendo o acento dourado sobreposto).

3. **Pontos de aplicação** — os mesmos de hoje: header, rodapé, marca d'água do hero, login, redefinição de senha, retorno do checkout e 404. Nenhum call site muda de API.

4. **Favicon inalterado.**

## Detalhes técnicos

- `lovable-assets create` a partir do arquivo enviado → `src/assets/logo-xfts-lockup.png.asset.json`.
- `src/components/Logo.tsx` passa a usar `<img>` com o ponteiro; mantém props `size`, `variant`, `inverted`, `compactSubtitle` (esta última deixa de ter efeito no lockup em imagem e vira no-op documentado).
- `src/components/LogoMark.tsx` continua existindo apenas para a marca d'água do hero e usos "mark", agora alimentado pela mesma arte.
- Em fundos claros uso `mask-image` com a arte + `bg-primary`, garantindo contraste sem gerar um segundo arquivo.
- Se você preferir enviar também a versão em verde petróleo/escuro da arte, eu troco a máscara pelo arquivo real — fica mais fiel.
