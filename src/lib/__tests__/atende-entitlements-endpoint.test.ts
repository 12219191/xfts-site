import { beforeEach, describe, expect, it, vi } from "vitest";
import { failTables, setState, supabaseAdmin } from "./supabase-admin-mock";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin }));
vi.mock("@/lib/sso.server", () => ({
  appApiKey: () => "test-key",
  safeEqual: (a: string, b: string) => a === b,
}));
vi.mock("@/lib/integration-log.server", () => ({ logIntegrationEvent: async () => {} }));
vi.mock("@/lib/capabilities.server", () => ({ resolveCapabilities: async () => ["dashboard.view"] }));

const { Route, CREDITS_BUILD } = await import("@/routes/api/public/entitlements");
const { resolveUserEntitlements, creditCycleForSub } = await import("@/lib/entitlements.server");

const USER = "f654ced0-9e06-4b2e-8f06-a72d806e7df5";
const SUB_ID = "955a85c6-78f3-4b88-a566-d49f5ac4814c";
const start = new Date(Date.now() - 86_400_000).toISOString();
const end = new Date(Date.now() + 20 * 86_400_000).toISOString();
const PLAN = {
  name: "Corporate", tier: "corporate", seats: 25,
  price_lookup_key: "flexus_atende_corporate_mensal", annual_lookup_key: null,
  entitlements: { usuarios: 25, agentes_ia: 20, creditos_ia_mensais: 30000 },
};
const SUB = {
  id: SUB_ID, price_id: "flexus_atende_corporate_mensal", status: "active",
  current_period_start: start, current_period_end: end, cancel_at_period_end: false,
  environment: "live", is_courtesy: true, credit_anchor: start,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers = (Route as any).options.server.handlers;
async function call() {
  const res: Response = await handlers.GET({
    request: new Request(`https://x/api/public/entitlements?app=atende&user_id=${USER}`, {
      headers: { "x-flexus-app-key": "test-key" },
    }),
  });
  return { res, body: await res.json() };
}

beforeEach(() => {
  failTables.clear();
  setState({
    plans: [PLAN],
    subscriptions: [SUB as never],
    definitions: [
      { id: "1", product_key: "atende", key: "usuarios", label: "Usuários", kind: "limit" },
      { id: "2", product_key: "atende", key: "agentes_ia", label: "Agentes", kind: "limit" },
      { id: "3", product_key: "atende", key: "creditos_ia_mensais", label: "Créditos", kind: "limit" },
    ],
  });
});

describe("GET /api/public/entitlements?app=atende (credits-cycle-r2)", () => {
  it("credit_cycle usa a MESMA assinatura do acesso e o marcador de build", async () => {
    const { res, body } = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-XFTS-Credits-Build")).toBe(CREDITS_BUILD);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({ produto: "atende", ativo: true, status: "active", plano: "Corporate", environment: "live" });
    expect(body.limites).toEqual({ usuarios: 25, agentes_ia: 20, creditos_ia_mensais: 30000 });
    expect(body.credit_cycle).toEqual({
      version: "atende-credits-1", subscription_id: SUB_ID, anchor: start, billing_interval: "month",
      period_start: start, access_until: end, is_courtesy: true, eligible: true, reason: null,
    });
    expect(Object.keys(body).sort()).toEqual(["produto","ativo","status","plano","papel","environment","motivo","limite_usuarios","usuarios_em_uso","recursos","limites","capabilities","acesso_ate","cancelamento_agendado","credit_cycle"].sort());
  });

  it("falha ao ler catálogo → fail closed sem vazar erro, acesso preservado", async () => {
    const ent = await resolveUserEntitlements(USER, "atende");
    failTables.add("catalog_plans");
    const c = await creditCycleForSub(ent.atendeSub ?? null);
    expect(c).toMatchObject({ subscription_id: SUB_ID, eligible: false, reason: "interval_unknown" });
    expect(JSON.stringify(c)).not.toContain("falha simulada");
  });

  it("sem assinatura → ciclo negativo com versão", async () => {
    setState({ plans: [PLAN], subscriptions: [] });
    const { body } = await call();
    expect(body.ativo).toBe(false);
    expect(body.credit_cycle).toMatchObject({ version: "atende-credits-1", subscription_id: null, eligible: false });
  });
});
