# Rastreamento claro de páginas e botões

Objetivo: ao olhar um lead ou um evento no GA4/GTM, saber exatamente **qual página** e **qual botão** originou o clique — com nomes legíveis e padronizados.

## Problema atual

- Os nomes de página são o caminho cru (`/produtos.gestao-esteticas`) e só três rotas têm rótulo amigável no admin.
- Os rótulos de CTA são livres e inconsistentes ("Solicitar Demo" em 5 páginas com locais diferentes: `gestao-clinica-hero`, `flexus-crm-pricing`, `hero`...).
- Vários botões não são rastreados: Header, Footer, WhatsApp de páginas de produto, cards de produto em `/produtos`, "Comparar planos", login/área do cliente.
- O formulário grava `tela` (caminho) e `botao` (nome do formulário), mas **não** registra o botão que trouxe o visitante até o formulário.

## O que será feito

### 1. Catálogo único de páginas
Novo `src/lib/page-registry.ts` com, para cada rota: slug canônico, nome legível ("FLEXUS | Estética — Produto") e grupo (Home, Produtos, Institucional, Conta, Admin). Uma única fonte de verdade usada por tracking, formulários e admin.

### 2. Taxonomia de botões
Padrão único de identificador: `pagina.secao.acao` (ex.: `estetica.hero.demo`, `home.produtos.card-crm`, `header.nav.acessar-sistema`, `comparar-planos.pro.assinar`). Cada clique envia: `cta_id`, rótulo visível, nome da página, seção e destino.

### 3. Cobertura completa de cliques
Instrumentar todos os CTAs hoje sem rastreio: Header (navegação, "Fale conosco", "Acessar sistema"), Footer, cards de produto, "Comparar todos os planos", botões de plano, WhatsApp por página, login e área do cliente.

### 4. Ligar o clique ao formulário enviado
O último CTA clicado passa a ser guardado no navegador (sessão) e enviado junto do formulário. Assim cada protocolo mostra: página de origem, botão clicado e formulário preenchido — além das UTMs já existentes.

### 5. Admin mais legível
Na aba Formulários: coluna "Página" e "Botão de origem" com nomes amigáveis, filtros por página e por botão, e um relatório de leads por página e por botão (com exportação CSV), no mesmo formato do relatório de UTMs.

## Detalhes técnicos

- `src/lib/page-registry.ts`: mapa `rota -> { slug, nome, grupo }` + `resolvePage(pathname)` com fallback para rotas dinâmicas (`/blog/$id`).
- `src/lib/tracking.ts`: `trackCTAClick` passa a aceitar `{ ctaId, label, section, destino }`, resolve a página pelo registry e grava o último clique em `sessionStorage` (`xfts_last_cta`).
- `src/lib/zapier.ts` / `zapier.functions.ts`: novos campos `cta_id`, `cta_label`, `cta_page` (normalizados como as UTMs) enviados ao Zapier e gravados no banco; `tela` passa a guardar o slug canônico.
- Migração: adicionar `cta_id`, `cta_label`, `cta_page` em `public.form_submissions` (nullable, sem impacto nos registros atuais).
- `FormSubmissionsPanel.tsx`: substituir `TELA_LABEL` pelo registry, adicionar filtros e o novo relatório por página/botão.
- Nenhuma mudança de layout ou de texto visível dos botões (apenas rastreio), salvo padronização de rótulos duplicados se você quiser.
