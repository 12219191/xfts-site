import { describe, it, expect } from "vitest";
import { buildCreditCycle, intervalFromPlans, CREDIT_CYCLE_VERSION } from "../atende-credit-cycle";
import { buildAtendeEntitlementsPayload } from "../atende-entitlements-payload";
import { buildAtendeProvisionBody } from "../atende-provision";
import { stripeCreditAnchor } from "../payments-webhook.server";

const NOW = Date.parse("2026-10-20T00:00:00Z");
const PLANS = [
  { price_lookup_key: "flexus_atende_basic_mensal", annual_lookup_key: "flexus_atende_basic_anual" },
  { price_lookup_key: "flexus_atende_corporate_mensal", annual_lookup_key: null },
];
const base = {
  id: "00000000-0000-4000-8000-000000000001", status: "active", environment: "live",
  current_period_start: "2026-10-05T00:00:00Z", current_period_end: "2026-11-04T00:00:00Z",
  is_courtesy: false, credit_anchor: "2026-10-05T00:00:00Z",
};
const KEYS = ["version","subscription_id","anchor","billing_interval","period_start","access_until","is_courtesy","eligible","reason"].sort();

describe("credit_cycle atende-credits-1", () => {
  it("intervalo pelo catálogo; ambíguo/desconhecido → null", () => {
    expect(intervalFromPlans("flexus_atende_basic_mensal", PLANS)).toBe("month");
    expect(intervalFromPlans("flexus_atende_basic_anual", PLANS)).toBe("year");
    expect(intervalFromPlans("x", PLANS)).toBeNull();
    expect(intervalFromPlans("k", [{ price_lookup_key: "k", annual_lookup_key: "k" }])).toBeNull();
    expect(intervalFromPlans("k", [{ price_lookup_key: "k", annual_lookup_key: null }, { price_lookup_key: "k", annual_lookup_key: null }])).toBeNull();
  });
  it("mensal elegível", () => {
    const c = buildCreditCycle(base, "month", NOW);
    expect(Object.keys(c).sort()).toEqual(KEYS);
    expect(c).toMatchObject({ version: CREDIT_CYCLE_VERSION, eligible: true, reason: null, billing_interval: "month" });
  });
  it("anual com cancelamento agendado segue elegível até access_until", () => {
    const c = buildCreditCycle({ ...base, status: "active", current_period_end: "2027-10-05T00:00:00Z" }, "year", NOW);
    expect(c).toMatchObject({ eligible: true, billing_interval: "year", access_until: "2027-10-05T00:00:00Z" });
  });
  it("cortesia elegível", () => {
    expect(buildCreditCycle({ ...base, is_courtesy: true }, "month", NOW)).toMatchObject({ eligible: true, is_courtesy: true });
  });
  it("anchor histórico incerto → inelegível", () => {
    expect(buildCreditCycle({ ...base, credit_anchor: null }, "month", NOW)).toMatchObject({ eligible: false, reason: "anchor_unverified", anchor: null });
  });
  it("intervalo ambíguo → inelegível", () => {
    expect(buildCreditCycle(base, null, NOW)).toMatchObject({ eligible: false, reason: "interval_unknown" });
  });
  it("expirada → inelegível (cortesia Oct5–Nov4 não recebe Nov5)", () => {
    expect(buildCreditCycle(base, "month", Date.parse("2026-11-05T00:00:00Z"))).toMatchObject({ eligible: false, reason: "access_expired" });
  });
  it("sandbox e status inválido → inelegível", () => {
    expect(buildCreditCycle({ ...base, environment: "sandbox" }, "month", NOW).reason).toBe("not_live");
    expect(buildCreditCycle({ ...base, status: "unpaid" }, "month", NOW).reason).toBe("status_not_eligible");
  });
  it("mesma forma nos 3 fluxos (entitlements/provision/negativo)", () => {
    const cycle = buildCreditCycle(base, "month", NOW);
    const ent = buildAtendeEntitlementsPayload({ planoNome: "Basic", features: {}, limites: {} }, { status: "active", current_period_end: base.current_period_end }, [], cycle);
    expect(ent.credit_cycle).toEqual(cycle);
    const neg = buildAtendeEntitlementsPayload({ features: {}, limites: {} }, null, [], cycle);
    expect(Object.keys(neg.credit_cycle).sort()).toEqual(KEYS);
    expect(neg.credit_cycle.subscription_id).toBeNull();
    const prov = buildAtendeProvisionBody({ event: "updated", userId: "u", priceId: "flexus_atende_basic_mensal", status: "active", accessUntil: null, environment: "live", planoNome: "Basic", features: {}, limites: {}, timestamp: "t", creditCycle: cycle });
    expect(prov.ok && prov.body["credit_cycle"]).toEqual(cycle);
    const canc = buildAtendeProvisionBody({ event: "canceled", userId: "u", priceId: "flexus_atende_basic_mensal", status: "canceled", accessUntil: null, environment: "live", planoNome: "Basic", features: {}, limites: {}, timestamp: "t", creditCycle: cycle });
    expect(canc.ok && (canc.body["credit_cycle"] as { eligible: boolean }).eligible).toBe(false);
  });
  it("anchor do Stripe: start_date > billing_cycle_anchor; ausente → nada", () => {
    expect(stripeCreditAnchor({ start_date: 1759622400, billing_cycle_anchor: 1760000000 })).toEqual({ credit_anchor: new Date(1759622400000).toISOString(), credit_anchor_source: "stripe_start_date" });
    expect(stripeCreditAnchor({ billing_cycle_anchor: 1760000000 }).credit_anchor_source).toBe("stripe_billing_cycle_anchor");
    expect(stripeCreditAnchor({})).toEqual({});
  });
});
