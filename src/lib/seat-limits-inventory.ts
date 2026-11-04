import { publicSeatLimit } from "@/lib/public-seat-limit";
import type { EntitlementMap } from "@/lib/entitlements";

/** Auditoria somente leitura: não resolve nem altera os direitos de assinatura. */
export type SeatInventoryPlan = {
  id: string;
  productKey: string;
  name: string;
  seats: number | null;
  entitlements: EntitlementMap;
  priceLookupKey: string | null;
  annualLookupKey: string | null;
};
export type SeatInventorySubscription = {
  priceId: string | null;
  seatsOverride: number | null;
  status: string | null;
};
export type SeatInventoryFinding = {
  planId: string;
  productKey: string;
  planName: string;
  mode: "limited" | "unlimited" | "undefined";
  subscriptionCount: number;
  overrideCount: number;
  issues: string[];
};

/** Não usa defaults por tier: sem cadastro, classifica como pendência. */
export function auditSeatLimits(
  plans: SeatInventoryPlan[],
  subscriptions: SeatInventorySubscription[],
): SeatInventoryFinding[] {
  return plans.map((plan) => {
    const mode = publicSeatLimit({ seats: plan.seats, entitlements: plan.entitlements });
    const assigned = subscriptions.filter((sub) =>
      sub.priceId != null && (sub.priceId === plan.priceLookupKey || sub.priceId === plan.annualLookupKey));
    const explicit = plan.entitlements.usuarios;
    const issues: string[] = [];
    if (mode.mode === "undefined") issues.push("limite_nao_configurado");
    if (mode.source === "seats") issues.push("entitlement_usuarios_ausente");
    if (typeof plan.seats === "number" && (explicit === null || typeof explicit === "number" && explicit !== plan.seats))
      issues.push("seats_diverge_do_entitlement");
    if (assigned.some((s) => s.seatsOverride !== null)) issues.push("override_na_assinatura");
    if (assigned.length && mode.mode === "undefined") issues.push("assinatura_com_limite_sem_definicao");
    return {
      planId: plan.id,
      productKey: plan.productKey,
      planName: plan.name,
      mode: mode.mode,
      subscriptionCount: assigned.length,
      overrideCount: assigned.filter((s) => s.seatsOverride !== null).length,
      issues,
    };
  });
}
