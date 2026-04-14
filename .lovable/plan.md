

## Rastreamento de Scroll Depth e Tempo na Pagina

### O que sera feito

Adicionar dois novos trackers automaticos que disparam eventos para GTM/GA4/Meta Pixel:

1. **Scroll Depth** -- dispara eventos quando o usuario atinge 25%, 50%, 75% e 100% da pagina, usando `IntersectionObserver` para performance.

2. **Tempo na Pagina** -- dispara eventos em marcos de 15s, 30s, 60s, 120s e 300s de permanencia, pausando quando a aba perde foco (`visibilitychange`).

### Implementacao

**Arquivo 1: `src/lib/tracking.ts`** -- adicionar duas novas funcoes exportadas:

- `trackScrollDepth(threshold: number, page: string)` -- envia evento `scroll_depth` com o percentual e pagina atual para GTM, GA4 e Meta.
- `trackTimeOnPage(seconds: number, page: string)` -- envia evento `time_on_page` com duracao e pagina para as 3 plataformas.

**Arquivo 2: `src/hooks/use-page-tracking.ts`** (novo) -- hook React que:

- Usa `useEffect` para registrar listeners de scroll e timer ao montar.
- **Scroll**: cria 4 elementos sentinela (divs invisíveis) em 25/50/75/100% da pagina via `IntersectionObserver`, ou usa `scroll` event com throttle calculando `scrollTop / scrollHeight`.
- **Tempo**: inicia `setInterval` de 1s, incrementa contador, dispara nos marcos definidos. Pausa/retoma com `document.visibilityState`.
- Reseta ambos ao mudar de rota (cleanup do useEffect).
- Cada marco dispara apenas uma vez por sessao de pagina.

**Arquivo 3: `src/routes/__root.tsx`** -- chamar `usePageTracking()` dentro de `RootComponent` para ativar automaticamente em todas as paginas.

### Eventos disparados

| Evento | Parametros | Marcos |
|--------|-----------|--------|
| `scroll_depth` | `percent`, `page_path` | 25, 50, 75, 100 |
| `time_on_page` | `seconds`, `page_path` | 15, 30, 60, 120, 300 |

### Detalhes tecnicos

- SSR-safe: todas as chamadas protegidas com `typeof window !== "undefined"`.
- Usa `useLocation` do TanStack Router para obter o path atual e resetar ao navegar.
- Scroll tracking via `scroll` event com `requestAnimationFrame` throttle (mais simples e confiavel que sentinelas).
- Sem dependencias externas.

