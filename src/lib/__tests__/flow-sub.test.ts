import { describe, expect, it } from "vitest";
import { flowEnvironment, flowPeriodFields, flowPurposeAllowed, pickFlowSub } from "@/lib/flow-sub";

const isFlow = (p: string) => p.startsWith("flexus_flow");
const future = "2099-01-01T00:00:00Z";
const past = "2000-01-01T00:00:00Z";
const row = (environment: string, status: string, end = future) => ({
  price_id: "flexus_flow_business_mensal",
  status,
  environment,
  current_period_start: "2026-10-01T00:00:00Z",
  current_period_end: end,
});

describe("Flow: ambiente da assinatura", () => {
  it("sandbox ativa sozinha devolve sandbox", () => {
    expect(flowEnvironment(pickFlowSub([row("sandbox", "trialing")], isFlow))).toBe("sandbox");
  });
  it("live ativa vence sandbox ativa", () => {
    const s = pickFlowSub([row("sandbox", "active"), row("live", "active")], isFlow);
    expect(flowEnvironment(s)).toBe("live");
  });
  it("live inativa + sandbox ativa devolve sandbox", () => {
    const s = pickFlowSub([row("live", "active", past), row("sandbox", "active")], isFlow);
    expect(flowEnvironment(s)).toBe("sandbox");
  });
  it("ignora assinaturas de outros sistemas", () => {
    expect(pickFlowSub([{ ...row("live", "active"), price_id: "flexus_crm_pro_mensal" }], isFlow)).toBeNull();
  });
});

describe("Flow: período e teste", () => {
  it("trial_fim só existe em teste", () => {
    expect(flowPeriodFields(row("sandbox", "trialing")).trial_fim).toBe(future);
    expect(flowPeriodFields(row("sandbox", "active")).trial_fim).toBeNull();
  });
});

describe("Flow: suporte antigo recusado", () => {
  it("recusa purpose support no token ou no registro", () => {
    expect(flowPurposeAllowed("support")).toBe(false);
    expect(flowPurposeAllowed(undefined, "support")).toBe(false);
    expect(flowPurposeAllowed("owner", null)).toBe(true);
  });
});
