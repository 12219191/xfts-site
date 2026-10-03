import { describe, expect, it, vi } from "vitest";
import { setState, supabaseAdmin } from "./supabase-admin-mock";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin }));

const { resolveUserEntitlements, resolveAtendeLive, ATENDE_DENIAL } = await import(
  "@/lib/entitlements.server"
);

const future = new Date(Date.now() + 86_400_000).toISOString();
const PLAN = {
  name: "Atende Teste",
  tier: "x",
  seats: null,
  price_lookup_key: "flexus_atende_teste",
  annual_lookup_key: null,
  entitlements: {},
};
const sub = (environment: string, extra: Record<string, unknown> = {}) => ({
  price_id: "flexus_atende_teste",
  status: "active",
  current_period_end: future,
  environment,
  ...extra,
});

/** Mesmo resolvedor alimenta SSO, GET entitlements e capability-check. */
async function decisions(userId = "u1") {
  const r = await resolveAtendeLive(userId);
  const ent = await resolveUserEntitlements(userId, "atende");
  return { sso: r.kind, ent };
}

describe("Atende: coerência live entre SSO, entitlements e capability-check", () => {
  it("live ativa → liberado em todos, environment live", async () => {
    setState({ plans: [PLAN], subscriptions: [sub("live")] });
    const d = await decisions();
    expect(d.sso).toBe("ok");
    expect(d.ent.ativo).toBe(true);
    expect(d.ent.environment).toBe("live");
    expect(d.ent.denialReason).toBeUndefined();
  });

  it("sandbox mais nova (sem live) nunca libera", async () => {
    setState({ plans: [PLAN], subscriptions: [sub("sandbox", { created_at: "2099-01-01" })] });
    const d = await decisions();
    expect(d.sso).toBe("none");
    expect(d.ent.ativo).toBe(false);
    expect(d.ent.denialReason).toBe(ATENDE_DENIAL.none);
  });

  it("sandbox nova + live ativa → usa a live", async () => {
    setState({
      plans: [PLAN],
      subscriptions: [sub("sandbox", { status: "unpaid" }), sub("live")],
    });
    const d = await decisions();
    expect(d.sso).toBe("ok");
    expect(d.ent.ativo).toBe(true);
    expect(d.ent.environment).toBe("live");
  });

  it("cortesia sandbox não libera live", async () => {
    setState({ plans: [PLAN], subscriptions: [sub("sandbox", { is_courtesy: true })] });
    expect((await decisions()).ent.ativo).toBe(false);
  });

  it("duas live ativas → ambíguo, negado com motivo", async () => {
    setState({ plans: [PLAN], subscriptions: [sub("live"), sub("live", { is_courtesy: true })] });
    const d = await decisions();
    expect(d.sso).toBe("ambiguous");
    expect(d.ent.ativo).toBe(false);
    expect(d.ent.denialReason).toBe(ATENDE_DENIAL.ambiguous);
  });

  it("outros produtos não mudam: casa360 continua pegando a primeira do produto", async () => {
    setState({
      plans: [{ ...PLAN, name: "C", price_lookup_key: "flexus_casa360_pro" }],
      subscriptions: [{ price_id: "flexus_casa360_pro", status: "active", current_period_end: future, environment: "sandbox" }],
    });
    const ent = await resolveUserEntitlements("u1", "casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.environment).toBeUndefined();
  });
});
