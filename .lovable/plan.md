

## Integrar Google Analytics, GTM e Meta Pixel com IDs Placeholder

### O que sera feito

Adicionar os scripts de rastreamento do Google Tag Manager (GTM), Google Analytics 4 (GA4) e Meta Pixel no site, usando IDs placeholder que voce pode substituir depois.

### IDs Placeholder

- **GTM:** `GTM-XXXXXXX`
- **GA4:** `G-XXXXXXXXXX`
- **Meta Pixel:** `1234567890123456`

### Implementacao tecnica

**Arquivo:** `src/routes/__root.tsx`

1. **Google Tag Manager** -- adicionar o script principal no `head` (via `scripts` na rota root) e o `<noscript>` fallback no `<body>` do `RootShell`.

2. **Google Analytics 4** -- carregar via GTM (recomendado) OU como script independente no `head`. Sera incluido como script independente tambem para garantir funcionamento mesmo sem GTM configurado.

3. **Meta Pixel** -- adicionar o script `fbq` no `head` via `scripts` na rota root, e o `<noscript><img>` fallback no `<body>` (CRITICO: noscript com img NAO pode ficar no head, causa erro no Vite).

### Estrutura no __root.tsx

- `head.scripts`: GTM script + GA4 gtag script + Meta Pixel fbq script
- `RootShell <body>`: GTM noscript iframe + Meta Pixel noscript img (antes de `{children}`)

### Como atualizar depois

Basta buscar os placeholders (`GTM-XXXXXXX`, `G-XXXXXXXXXX`, `1234567890123456`) no arquivo `__root.tsx` e substituir pelos IDs reais.

