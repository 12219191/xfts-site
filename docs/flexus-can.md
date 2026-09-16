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
