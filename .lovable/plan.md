# Saber qual botão e qual origem (UTM) gerou cada envio

## Situação atual

Hoje cada envio grava apenas:
- `tela` — o caminho da página (ex.: `/contato`)
- `source` — o domínio de origem (ex.: `https://xfts-flexus.com`)

Não há registro de **qual botão/formulário** foi usado nem de **UTMs** (campanha, anúncio, origem do tráfego). Se dois formulários existirem na mesma página, hoje eles ficam indistinguíveis.

## O que será implementado

### 1. Identificação do botão/formulário
Cada formulário passa a enviar um identificador próprio, por exemplo:
- `home_demo` (CTA de demonstração na home)
- `contato_mensagem` (formulário da página de contato)
- `exclusao_dados` (solicitação LGPD)

Assim o painel mostra exatamente qual CTA gerou o lead, mesmo com vários na mesma página.

### 2. Captura de UTMs e origem do tráfego
Na primeira visita, o site guarda no navegador (sessão) os parâmetros da URL:
`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, além de `referrer` (site que trouxe o visitante) e a página de entrada. Esses valores acompanham o visitante até o envio do formulário, mesmo que ele navegue por várias páginas antes.

### 3. Envio e armazenamento
Esses campos vão junto no webhook do Zapier (podendo ser mapeados no e-mail/CRM) e são gravados no banco junto com o protocolo.

### 4. Painel administrativo
Na aba **Formulários** do `/admin`:
- Nova coluna "Origem" mostrando botão + campanha
- Filtros por botão/formulário e por `utm_source` / `utm_campaign`
- Detalhes completos de UTM, referrer e página de entrada por registro

## Detalhes técnicos

- Nova migração: colunas `botao`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `referrer`, `landing_page` em `public.form_submissions` (todas `text`, nullable). Sem mudança de RLS/grants.
- Novo módulo `src/lib/attribution.ts`: lê `window.location.search` e `document.referrer`, persiste em `sessionStorage` na primeira visita (first-touch) e expõe `getAttribution()`. Todo acesso a browser globals fica dentro de funções chamadas em `useEffect`/handlers.
- `src/lib/zapier.ts`: `sendToZapier(data, formType, botao)` passa a anexar a atribuição ao payload.
- `src/lib/zapier.functions.ts`: schema Zod estendido com os novos campos (com limites de tamanho) e persistência em `form_submissions`.
- `src/lib/form-submissions.functions.ts`: retorna os novos campos e aceita filtros por `botao`, `utm_source`, `utm_campaign`.
- `src/components/admin/FormSubmissionsPanel.tsx`: nova coluna, filtros e exibição dos detalhes.
- Formulários atualizados: `src/routes/index.tsx`, `src/routes/contato.tsx`, `src/routes/exclusao-de-dados.tsx`.

Registros antigos ficam com os novos campos vazios (exibidos como "—").
