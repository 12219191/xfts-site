# Aplicação do logo XFTS no site

O logo enviado (mosaico de losangos, teal sobre fundo transparente) é um símbolo quadrado, sem texto. Isso define como ele deve ser usado: sempre acompanhado do wordmark "XFTS" nas áreas de marca, e sozinho apenas em espaços pequenos (favicon, avatar, botão).

## Onde colocar (estudo)

1. **Header (prioridade 1)** — símbolo à esquerda de "XFTS / Inteligência Analítica", altura 32px, dentro do link para a home. Substitui a marca hoje puramente tipográfica. No mobile mantém apenas símbolo + "XFTS".
2. **Favicon / ícone do app** — versão quadrada 64x64 em `public/favicon.png`, referenciada no root. Hoje o site usa o favicon padrão.
3. **Rodapé** — símbolo em versão clara (o teal tem contraste suficiente sobre o azul do rodapé; caso contrário, versão monocromática branca) acima do nome da empresa, altura 40px.
4. **Marca d'água no hero da home** — símbolo grande (~420px) com opacidade baixa (~8%) no canto direito do hero, atrás do texto. Dá presença de marca sem competir com o título.
5. **Página de login e reset de senha** — símbolo centralizado acima do formulário, 56px. Reforça confiança no momento de autenticação.
6. **Checkout / retorno de checkout** — símbolo pequeno no topo do card de sucesso, junto ao selo de confirmação.
7. **Estado 404 e estados vazios** — símbolo em cinza claro acima do texto, substituindo o "404" puro.
8. **Imagem de compartilhamento (og:image)** — manter o screenshot atual; nesta etapa não geramos nova arte social.

## Onde NÃO colocar

- Cards de produto (já têm ícone próprio por segmento — duplicaria sinal visual).
- Cabeçalho de cada seção interna e do painel admin (ruído).
- Botões de CTA.

## Detalhes técnicos

- Upload do PNG via `lovable-assets` gerando `src/assets/logo-xfts.png.asset.json`; import do ponteiro nos componentes. Sem binário no repositório.
- Exceção: o favicon precisa de arquivo real — `public/favicon.png` 64x64 gerado por redimensionamento com padding, `{ rel: "icon", type: "image/png" }` no `head().links` de `src/routes/__root.tsx`, e remoção do `public/favicon.ico` padrão.
- Novo componente `src/components/Logo.tsx` com props `size` e `variant` ("full" = símbolo + wordmark, "mark" = só símbolo), usado por Header, Footer, login, checkout e 404 — evita repetir markup e mantém `alt` consistente ("XFTS Inteligência Analítica").
- Arquivos tocados: `src/components/Logo.tsx` (novo), `Header.tsx`, `Footer.tsx`, `__root.tsx`, `src/routes/index.tsx`, `login.tsx`, `reset-password.tsx`, `checkout.retorno.tsx`.
- O teal do logo não existe hoje nos tokens; adiciono `--brand` em `src/styles.css` para eventuais detalhes que precisem acompanhar a cor do símbolo. Nenhuma cor existente é alterada.

## Escopo

Somente apresentação. Nenhuma mudança em autenticação, assinaturas, SSO ou backend.
