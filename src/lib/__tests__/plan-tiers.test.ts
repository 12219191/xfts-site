import { describe, it, expect } from "vitest";
import { planTierError, tiersForProduct } from "../catalog";

// Espelha as linhas reais (sem gravar nada): abrir mantém o tier, salvar valida.
const ATENDE = [
  { product_key: "atende", name: "Basic", tier: "basic" },
  { product_key: "atende", name: "Standard", tier: "standard" },
  { product_key: "atende", name: "Corporate", tier: "corporate" },
];

describe("tiers por produto", () => {
  for (const row of ATENDE) {
    it(`abrir+salvar ${row.name} mantém tier ${row.tier}`, () => {
      const formTier = row.tier; // editor carrega plan.tier sem conversão
      expect(tiersForProduct("atende")).toContain(formTier);
      expect(planTierError("atende", formTier, row.product_key)).toBeNull();
    });
  }
  it("atende recusa tiers padrão", () => {
    for (const t of ["basico", "pro", "enterprise"]) expect(planTierError("atende", t)).toMatch(/inválido/);
  });
  it("produtos existentes recusam tiers do atende", () => {
    for (const p of ["barbearia", "clinica", "estetica", "crm", "casa360", "aba"])
      for (const t of ["basic", "standard", "corporate"]) expect(planTierError(p, t)).toMatch(/inválido/);
  });
  it("regressão: produtos existentes aceitam basico/pro/enterprise", () => {
    for (const p of ["barbearia", "clinica", "crm", "casa360"])
      for (const t of ["basico", "pro", "enterprise"]) expect(planTierError(p, t, p)).toBeNull();
  });
  it("plano não pode mudar de produto", () => {
    expect(planTierError("barbearia", "pro", "atende")).toBe("O plano pertence a outro produto.");
  });
});

import { courtesyTiersForProduct } from "../catalog";
describe("cortesia por produto", () => {
  it("atende gera lookup real flexus_atende_basic_mensal", () => {
    const t = courtesyTiersForProduct("atende");
    expect(t).toEqual(["basic", "standard", "corporate"]);
    expect(`flexus_atende_${t[0]}_mensal`).toBe("flexus_atende_basic_mensal");
    expect(t).not.toContain("basico");
  });
  it("regressão: demais produtos seguem basico/pro", () => {
    for (const p of ["barbearia", "crm", "casa360", "clinica"]) expect(courtesyTiersForProduct(p)).toEqual(["basico", "pro"]);
  });
});
