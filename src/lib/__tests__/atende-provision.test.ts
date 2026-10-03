import { describe, it, expect } from "vitest";
import { buildAtendeProvisionBody } from "../atende-provision";
import { signBody } from "../sso.server";

const PLANS = [
  ["flexus_atende_basic_mensal", "Basic", 2, 2, 2500],
  ["flexus_atende_standard_mensal", "Standard", 10, 10, 11500],
  ["flexus_atende_corporate_mensal", "Corporate", 20, 20, 30000],
] as const;
const base = { event: "created" as const, userId: "u-1", status: "active", accessUntil: null, timestamp: "2026-10-03T00:00:00.000Z" };

describe("provisionamento atende", () => {
  for (const [key, name, ops, agents, credits] of PLANS) {
    it(`${key} → plano ${name} com limites do catálogo, assinado`, async () => {
      const limites = { usuarios: ops, agentes_ia: agents, creditos_ia_mensais: credits };
      const r = buildAtendeProvisionBody({ ...base, priceId: key, environment: "live", planoNome: name, features: {}, limites });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.body).toMatchObject({ produto: "atende", plano: name, limite_usuarios: ops, limites, environment: "live", price_id: key });
      expect(["Básico", "Pro", "Enterprise"]).not.toContain(r.body.plano);
      const sig = await signBody("chave-de-teste", JSON.stringify(r.body));
      expect(typeof sig).toBe("string");
      expect(sig.length).toBeGreaterThan(10);
    });
  }
  it("sandbox não provisiona", () => {
    const r = buildAtendeProvisionBody({ ...base, priceId: PLANS[0][0], environment: "sandbox", planoNome: "Basic", features: {}, limites: { usuarios: 2 } });
    expect(r.ok).toBe(false);
  });
  it("plano não reconhecido bloqueia sem fallback", () => {
    const r = buildAtendeProvisionBody({ ...base, priceId: "flexus_atende_xyz_mensal", environment: "live", planoNome: null, features: {}, limites: { usuarios: 6 } });
    expect(r).toEqual({ ok: false, error: "atende: plano não reconhecido no catálogo" });
  });
  it("cancelamento zera limites", () => {
    const r = buildAtendeProvisionBody({ ...base, event: "canceled", priceId: PLANS[1][0], environment: "live", planoNome: "Standard", features: {}, limites: { usuarios: 10 } });
    expect(r.ok && r.body).toMatchObject({ limite_usuarios: 0, limites: {}, recursos: {} });
  });
});
