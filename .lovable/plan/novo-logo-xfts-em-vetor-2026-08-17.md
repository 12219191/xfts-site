# Novo logo XFTS em vetor

Recriar o logo enviado (símbolo de losangos + wordmark "XFTS / Inteligência Analítica") como SVG limpo e aplicá-lo em todos os pontos do estudo anterior, exceto o favicon (que continua como está).

## O que muda

1. **Símbolo em SVG**
   - Composição de quadrados rotacionados 45° em torno de um quadrado central, com um quadradinho superior esquerdo em dourado (`#FFC107`), igual à referência.
   - Cores por token: verde petróleo em fundos claros e off-white em fundos escuros, com o detalhe dourado fixo.
   - Nítido em qualquer tamanho, sem sombras nem fundo.

2. **Wordmark**
   - "XFTS" em peso extrabold e "Inteligência Analítica" abaixo, proporções e espaçamento seguindo a referência.

3. **Pontos de aplicação** (todos já existentes)
   - Header, rodapé, marca d'água do hero, login, redefinição de senha, retorno do checkout e página 404.
   - As variantes `full` / `mark` e o modo invertido continuam funcionando igual, então nenhum call site precisa mudar de API.

4. **Favicon inalterado** — `public/favicon.png` permanece como está.

## Detalhes técnicos

- Criar `src/components/LogoMark.tsx` com o símbolo em SVG inline (`currentColor` no corpo + dourado fixo no acento).
- Atualizar `src/components/Logo.tsx` para renderizar `LogoMark` no lugar do `<img>` do `logo-xfts.png.asset.json`; manter `size`, `variant`, `inverted`, `compactSubtitle`.
- `LOGO_URL` (usado na marca d'água do hero em `src/routes/index.tsx`) deixa de ser imagem: a marca d'água passa a usar `LogoMark` com opacidade baixa.
- O pointer `src/assets/logo-xfts.png.asset.json` permanece no projeto por enquanto (favicon e OG não são afetados).
