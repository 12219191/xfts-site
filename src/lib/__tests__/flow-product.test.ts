import { describe, expect, it } from "vitest";
import { appKeyFromPriceId, planTierFromPriceId, seatsFromPriceId } from "@/lib/flexus-apps";
import { planTierError, tiersForProduct } from "@/lib/catalog";

describe("FLEXUS | Flow", () => {
  it("lookup keys do Flow pertencem ao produto flow", () => {
    expect(appKeyFromPriceId("flexus_flow_pro_anual")).toBe("flow");
  });
  it("Business e Start nunca viram Básico", () => {
    expect(planTierFromPriceId("flexus_flow_business_mensal")).toBe("Business");
    expect(planTierFromPriceId("flexus_flow_start_mensal")).toBe("Start");
  });
  it("tiers do Flow: start, pro, business e enterprise", () => {
    expect([...tiersForProduct("flow")]).toEqual(["start", "pro", "business", "enterprise"]);
    expect(planTierError("flow", "basico")).not.toBeNull();
  });
  it("usuários por plano: 3, 10, 25 e 100", () => {
    expect(seatsFromPriceId("flexus_flow_start_mensal")).toBe(3);
    expect(seatsFromPriceId("flexus_flow_pro_mensal")).toBe(10);
    expect(seatsFromPriceId("flexus_flow_business_anual")).toBe(25);
    expect(seatsFromPriceId("flexus_flow_enterprise_mensal")).toBe(100);
  });
});
