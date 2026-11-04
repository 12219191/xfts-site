import { describe, expect, it } from "vitest";
import { catalogComparisonFeatures } from "../catalog-comparison";
import type { ProductPlan } from "../product-plans";

function plan(tier: ProductPlan["tier"], features: string[]): ProductPlan {
  return { name: tier, price: "R$ 100", description: "", tier, features, ctaLabel: "Começar" };
}

describe("P1-01A: comparador derivado dos recursos oficiais", () => {
  it("não introduz recursos ausentes do catálogo", () => {
    expect(catalogComparisonFeatures({
      basico: plan("basico", ["Agenda", "PDV"]),
      pro: plan("pro", ["Agenda", "Relatórios"]),
      enterprise: plan("enterprise", ["API"]),
    })).toEqual([
      { name: "Agenda", basico: true, pro: true, enterprise: false },
      { name: "PDV", basico: true, pro: false, enterprise: false },
      { name: "Relatórios", basico: false, pro: true, enterprise: false },
      { name: "API", basico: false, pro: false, enterprise: true },
    ]);
  });

  it("expande a herança do catálogo sem exibir 'Tudo do' como recurso", () => {
    expect(catalogComparisonFeatures({
      basico: plan("basico", ["Agenda"]),
      pro: plan("pro", ["Tudo do Básico", "Relatórios"]),
      enterprise: plan("enterprise", ["Tudo do Pro", "API"]),
    })).toEqual([
      { name: "Agenda", basico: true, pro: true, enterprise: true },
      { name: "Relatórios", basico: false, pro: true, enterprise: true },
      { name: "API", basico: false, pro: false, enterprise: true },
    ]);
  });

  it("não preenche recursos para plano ausente ou catálogo vazio", () => {
    expect(catalogComparisonFeatures({ basico: plan("basico", ["Agenda"]) })).toEqual([
      { name: "Agenda", basico: true, pro: false, enterprise: false },
    ]);
    expect(catalogComparisonFeatures({})).toEqual([]);
  });

  it("remove duplicatas normalizando espaços e caixa", () => {
    expect(catalogComparisonFeatures({
      basico: plan("basico", [" Agenda   Online "]),
      pro: plan("pro", ["agenda online"]),
    })).toEqual([{ name: "Agenda   Online", basico: true, pro: true, enterprise: false }]);
  });
});
