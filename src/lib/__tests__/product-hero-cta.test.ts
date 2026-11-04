import { describe, expect, it } from "vitest";
import { getProductHeroCta } from "../product-hero-cta";
import type { ProductPlan } from "../product-plans";

function plan(trialDays?: number, priceId?: string): ProductPlan {
  return {
    name: "Pro",
    price: "R$ 199",
    description: "",
    tier: "pro",
    features: [],
    ctaLabel: "Começar agora",
    ...(trialDays !== undefined ? { trialDays } : {}),
    ...(priceId ? { priceId } : {}),
  };
}

describe("hero CTA baseado no catálogo", () => {
  it("direciona teste gratuito somente para planos contratáveis com trial", () => {
    expect(getProductHeroCta({ status: "active", purchasable: true, plans: [plan(7, "lookup_pro")] })).toEqual({
      label: "Começar teste grátis", destination: "pricing", trialDays: 7,
    });
  });

  it("não anuncia trial se não há preço ou o trial é zero", () => {
    expect(getProductHeroCta({ status: "active", purchasable: true, plans: [plan(7)] }).destination).toBe("contact");
    expect(getProductHeroCta({ status: "active", purchasable: true, plans: [plan(0, "lookup_pro")] }).label).toBe("Conhecer os planos");
  });

  it("não oferece compra quando é contactOnly ou indisponível", () => {
    expect(getProductHeroCta({ status: "active", purchasable: true, contactOnly: true, plans: [plan(7, "lookup_pro")] }).destination).toBe("contact");
    expect(getProductHeroCta({ status: "paused", purchasable: false, plans: [plan(7, "lookup_pro")] }).destination).toBe("contact");
  });

  it("prioriza lista de espera para produto em desenvolvimento", () => {
    expect(getProductHeroCta({ status: "development", purchasable: false, plans: [] })).toEqual({
      label: "Entrar na lista de espera", destination: "waitlist", trialDays: null,
    });
  });
});
