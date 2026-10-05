import { describe, it, expect } from "vitest";
import { buildAtendeEntitlementsPayload } from "../atende-entitlements-payload";

const KEYS = ["produto","ativo","status","plano","papel","environment","motivo","limite_usuarios","usuarios_em_uso","recursos","limites","capabilities","acesso_ate","cancelamento_agendado","credit_cycle"].sort();

describe("contrato entitlements atende", () => {
  it("positivo: produto atende, environment live", () => {
    const p = buildAtendeEntitlementsPayload(
      { planoNome: "Plano X", denialReason: null, features: { f: true }, limites: { usuarios: 5 } },
      { status: "active", seats_used: 2, current_period_end: "2026-12-01T00:00:00Z", cancel_at_period_end: false },
      ["dashboard.view"],
    );
    expect(Object.keys(p).sort()).toEqual(KEYS);
    expect(p).toMatchObject({ produto: "atende", ativo: true, environment: "live", papel: "owner", limite_usuarios: 5, capabilities: ["dashboard.view"] });
  });
  it("negativo: produto atende, environment null, motivo", () => {
    const p = buildAtendeEntitlementsPayload(
      { denialReason: "Sem assinatura live ativa do FLEXUS | Atende.", features: { f: true }, limites: { usuarios: 5 } },
      null, ["dashboard.view"],
    );
    expect(Object.keys(p).sort()).toEqual(KEYS);
    expect(p).toEqual({
      produto: "atende", ativo: false, status: "none", plano: null, papel: "owner", environment: null,
      motivo: "Sem assinatura live ativa do FLEXUS | Atende.", limite_usuarios: 0, usuarios_em_uso: 0,
      recursos: {}, limites: {}, capabilities: [], acesso_ate: null, cancelamento_agendado: false,
      credit_cycle: { version: "atende-credits-1", subscription_id: null, anchor: null, billing_interval: null, period_start: null, access_until: null, is_courtesy: null, eligible: false, reason: "no_active_subscription" },
    });
  });
});
