# Migração dos SaaS: de `hasEntitlement(...)` para `can("capability.key")`

Vale para **FLEXUS Barbearia, Clínica, Estética e CRM**. Nada muda em planos, Stripe,
checkout ou assinaturas — o hub apenas passa a responder por capability.

## 1. O que o hub já entrega

`GET /api/public/entitlements?app=<barbearia|clinica|estetica|crm>&user_id=<uuid>`
(header `x-flexus-app-key: <chave do sistema>`) devolve, além do formato antigo:

```json
{ "ativo": true, "recursos": {...}, "limites": {...},
  "capabilities": ["agenda.view", "reports.retention_analysis", "..."] }
```

`POST /api/public/capability-check` (mesmo header) valida uma capability isolada e
responde **403** quando não liberada:

```json
{ "app": "barbearia", "user_id": "<uuid>", "capability": "reports.export", "acting_as": "TENANT" }
```

O hub resolve entitlement do plano + capability do produto + escopo de visibilidade.
Escopos internos da XFTS nunca são liberados por essa rota.

## 2. Cliente `can()` para colar em cada SaaS

```ts
// src/lib/can.ts (no SaaS)
const HUB = "https://xfts-flexus.com";
let cache: { keys: Set<string>; at: number } | null = null;

export async function loadCapabilities(app: string, userId: string, apiKey: string) {
  if (cache && Date.now() - cache.at < 60_000) return cache.keys;
  const r = await fetch(`${HUB}/api/public/entitlements?app=${app}&user_id=${userId}`, {
    headers: { "x-flexus-app-key": apiKey },
  });
  const data = await r.json();
  cache = { keys: new Set<string>(data.capabilities ?? []), at: Date.now() };
  return cache.keys;
}

/** UI: esconder/mostrar. Nunca use isto como única proteção. */
export function can(key: string) {
  return cache?.keys.has(key) ?? false;
}

/** Backend do SaaS: obrigatório antes de qualquer operação sensível. */
export async function requireCan(app: string, userId: string, apiKey: string, key: string) {
  const r = await fetch(`${HUB}/api/public/capability-check`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-flexus-app-key": apiKey },
    body: JSON.stringify({ app, user_id: userId, capability: key, acting_as: "TENANT" }),
  });
  if (!r.ok) throw Object.assign(new Error("Recurso não liberado no plano"), { status: 403 });
}
```

## 3. Substituições

| Antes | Depois |
| --- | --- |
| `if (plan === "PRO")` | `can("reports.retention_analysis")` |
| `entitlements.relatorios_avancados` | `can("reports.retention_analysis")` / `can("reports.professional_ranking")` |
| `entitlements.exportacao_dados` | `can("reports.export")` |
| `entitlements.integracoes_api` | `can("integrations.api")` |
| `entitlements.automacoes` | `can("automations.*")` |
| `entitlements.marca_propria` | `can("branding.custom")` |

No backend do SaaS, toda rota/ação protegida chama `requireCan(...)` — a UI usa `can(...)`
apenas para exibição.

## 4. Capability map atual (cadastrado no hub, editável em /admin/produtos → Capabilities)

- **Barbearia:** `agenda.view`, `appointments.manage`, `sales.manage`, `reports.basic`,
  `reports.retention_analysis`, `reports.professional_ranking`, `reports.export`,
  `integrations.api`, `automations.whatsapp`, `branding.custom`
- **Clínica:** `agenda.view`, `appointments.manage`, `patients.manage`, `reports.basic`,
  `reports.retention_analysis`, `reports.professional_ranking`, `reports.export`,
  `integrations.api`, `automations.reminders`, `branding.custom`
- **Estética:** `agenda.view`, `appointments.manage`, `packages.manage`, `reports.basic`,
  `reports.retention_analysis`, `reports.professional_ranking`, `reports.export`,
  `integrations.api`, `automations.reminders`, `branding.custom`
- **CRM:** `leads.manage`, `pipeline.manage`, `activities.manage`, `reports.basic`,
  `reports.sales_funnel`, `reports.revenue_forecast`, `reports.export`,
  `integrations.api`, `automations.cadence`, `branding.custom`

Novas funcionalidades e mudanças de plano exigido são feitas no admin, sem deploy dos SaaS.

## 5. Bloqueio das telas reais do SaaS

`GET /api/public/capability-routes?app=<app>` (header `x-flexus-app-key`) devolve o mapa
cadastrado no hub — sem deploy do SaaS quando uma tela muda de plano:

```json
{ "app": "barbearia",
  "routes": { "/relatorios/retencao": "reports.retention_analysis", "/agenda": "agenda.view" },
  "actions": { "EXPORT:relatorios.csv": "reports.export", "REPORT:ranking": "reports.professional_ranking" } }
```

### 5.1 Guard de tela (React)

```tsx
// src/components/CapabilityRoute.tsx (no SaaS)
import { useEffect, useState } from "react";
import { can, loadCapabilities } from "@/lib/can";

let routeMap: Record<string, string> | null = null;

export async function loadRouteMap(app: string, apiKey: string) {
  if (routeMap) return routeMap;
  const r = await fetch(`https://xfts-flexus.com/api/public/capability-routes?app=${app}`, {
    headers: { "x-flexus-app-key": apiKey },
  });
  routeMap = (await r.json()).routes ?? {};
  return routeMap;
}

export function CapabilityRoute({ app, userId, apiKey, path, children }: {
  app: string; userId: string; apiKey: string; path: string; children: React.ReactNode;
}) {
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  useEffect(() => {
    (async () => {
      const [map] = await Promise.all([
        loadRouteMap(app, apiKey),
        loadCapabilities(app, userId, apiKey),
      ]);
      const key = map[path];
      setState(!key || can(key) ? "ok" : "denied");
    })().catch(() => setState("denied")); // fail-closed
  }, [app, userId, apiKey, path]);

  if (state === "loading") return null;
  if (state === "denied")
    return (
      <div className="p-8 text-center">
        <p className="font-medium">Recurso não incluído no seu plano</p>
        <a className="underline" href="https://xfts-flexus.com/minha-conta">Ver planos e fazer upgrade</a>
      </div>
    );
  return <>{children}</>;
}
```

Uso: envolver cada tela protegida — `<CapabilityRoute path="/relatorios/retencao" ...><Retencao /></CapabilityRoute>`.

### 5.2 Guard obrigatório no backend do SaaS

A tela é só apresentação: cada rota/handler correspondente chama `requireCan(...)` (seção 2)
antes de responder. O hub devolve **403** e o SaaS repassa 403 — nenhuma decisão fica no cliente.

```ts
// exemplo: handler do relatório de retenção
await requireCan(app, userId, apiKey, "reports.retention_analysis");
```

## 6. Kit pronto para instalar

Os arquivos finais (sem adaptação) estão em `docs/integracao-hub/capability-gate/`:

- `xfts-hub-client.ts` → `src/lib/xfts-hub.ts` no SaaS (cache 60s, `can`, `requireCan`, `requireRoute`, `requireAction`, fail-closed)
- `CapabilityGate.tsx` → bloqueio de tela + tela "Recurso indisponível no seu plano"
- `gate-endpoint.ts` → rota `GET /api/xfts/gate` e o middleware `xftsGuard` que devolve **403 real**
- `INSTALL.md` → passo a passo, variáveis de ambiente, mapa telas × capability e checklist de aceite

A chave do sistema fica só no backend do SaaS; o browser consulta a rota interna `/api/xfts/gate`.
