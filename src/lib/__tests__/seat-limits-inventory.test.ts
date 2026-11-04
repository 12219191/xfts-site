import { describe, expect, it } from "vitest";
import { auditSeatLimits } from "../seat-limits-inventory";

const plan = (entitlements: Record<string, boolean | number | null>, seats: number | null = null) => ({
  id: "p1", productKey: "barbearia", name: "Pro", seats, entitlements,
  priceLookupKey: "barbearia_pro_mensal", annualLookupKey: "barbearia_pro_anual",
});

describe("P1-02B: inventário seguro dos limites existentes", () => {
  it("identifica entitlement ausente e uso de seats legado", () => {
    expect(auditSeatLimits([plan({}, 5)], [])[0]).toMatchObject({
      mode: "limited", subscriptionCount: 0,
      issues: ["entitlement_usuarios_ausente"],
    });
  });

  it("separa ilimitado explícito de null legado não configurado", () => {
    expect(auditSeatLimits([plan({ usuarios: null })], [])[0].mode).toBe("unlimited");
    expect(auditSeatLimits([plan({})], [])[0].issues).toContain("limite_nao_configurado");
  });

  it("detecta conflito, assinatura vinculada e override sem modificar registros", () => {
    const p = plan({ usuarios: 3 }, 6);
    const sub = { priceId: "barbearia_pro_anual", seatsOverride: 8, status: "active" };
    const result = auditSeatLimits([p], [sub])[0];
    expect(result.subscriptionCount).toBe(1);
    expect(result.overrideCount).toBe(1);
    expect(result.issues).toContain("seats_diverge_do_entitlement");
    expect(result.issues).toContain("override_na_assinatura");
    expect(p.entitlements.usuarios).toBe(3);
    expect(sub.seatsOverride).toBe(8);
  });

  it("marca assinatura com cadastro indefinido para revisão antes de remover fallback", () => {
    const result = auditSeatLimits([plan({})], [
      { priceId: "barbearia_pro_mensal", seatsOverride: null, status: "trialing" },
    ])[0];
    expect(result.issues).toContain("assinatura_com_limite_sem_definicao");
  });

  it("não associa assinatura de outro plano ou sem price_id", () => {
    expect(auditSeatLimits([plan({ usuarios: 2 })], [
      { priceId: "outro", seatsOverride: 10, status: "active" },
      { priceId: null, seatsOverride: null, status: null },
    ])[0].subscriptionCount).toBe(0);
  });
});
