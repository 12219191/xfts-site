import { describe, expect, it } from "vitest";
import { codeCatalog } from "../catalog.server";
import { plansForProduct, canPurchase } from "../catalog";
import { productJsonLd } from "../product-schema";

describe("P0: catálogo público em falha segura", () => {
  it("não publica planos estáticos nem permite contratação pelo fallback", () => {
    const snapshot = codeCatalog();
    expect(snapshot.fallback).toBe(true);
    expect(snapshot.plans).toEqual([]);
    expect(snapshot.products.every((product) => !canPurchase(product))).toBe(true);
    for (const product of snapshot.products) {
      expect(plansForProduct(snapshot, product.key)).toEqual([]);
    }
  });

  it("não inclui ofertas estruturadas quando os planos são indisponíveis", () => {
    const script = productJsonLd({
      name: "FLEXUS | Teste",
      description: "Teste de indisponibilidade comercial",
      path: "/produtos/teste",
      plans: [],
    });
    const schema = JSON.parse(script.children);
    expect(schema.offers).toEqual([]);
  });
});
