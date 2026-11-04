import type { EntitlementMap } from "@/lib/entitlements";

/** Capacidade de acesso por usuário/morador (não confundir com profissionais).
 * Os entitlements explícitos são a fonte de verdade atual no resolver.
 * `seats = null` isolado NÃO prova capacidade ilimitada. */
export type PublicSeatLimit =
  | { mode: "limited"; value: number; source: "entitlements" | "seats" }
  | { mode: "unlimited"; source: "entitlements" }
  | { mode: "undefined"; source: "none" };

export function publicSeatLimit(plan: { seats: number | null; entitlements: EntitlementMap }): PublicSeatLimit {
  const ent = plan.entitlements["usuarios"];
  if (Object.prototype.hasOwnProperty.call(plan.entitlements, "usuarios")) {
    if (ent === null) return { mode: "unlimited", source: "entitlements" };
    if (typeof ent === "number" && Number.isSafeInteger(ent) && ent >= 0)
      return { mode: "limited", value: ent, source: "entitlements" };
    // Um entitlement explícito porém inválido não deve cair no fallback.
    return { mode: "undefined", source: "none" };
  }
  if (typeof plan.seats === "number" && Number.isSafeInteger(plan.seats) && plan.seats >= 0)
    return { mode: "limited", value: plan.seats, source: "seats" };
  return { mode: "undefined", source: "none" };
}

/** Diagnóstico para cadastro legado; nenhum direito é alterado. */
export function seatLimitConflict(plan: { seats: number | null; entitlements: EntitlementMap }): boolean {
  const explicit = plan.entitlements["usuarios"];
  return typeof plan.seats === "number" &&
    (explicit === null || (typeof explicit === "number" && explicit !== plan.seats));
}
