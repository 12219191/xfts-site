import type { ProductPlan } from "@/lib/product-plans";

/** Os direitos explícitos em entitlements.usuarios prevalecem sobre seats legado.
 * Sem fonte configurada, nunca afirmar ilimitado. */
export function includedSeatsLabel(plan: Pick<ProductPlan, "seats" | "seatLimit"> | null | undefined, productKey: string): string {
  if (!plan) return "Sob consulta";
  const explicit = plan.seatLimit;
  if (explicit?.mode === "unlimited") {
    return productKey === "casa360" ? "Moradores ilimitados" : "Usuários ilimitados";
  }
  if (explicit?.mode === "undefined") return "Sob consulta";
  const count = explicit?.mode === "limited" ? explicit.value : plan.seats;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return "Sob consulta";
  const unit = productKey === "casa360" ? (count === 1 ? "morador" : "moradores") : (count === 1 ? "usuário" : "usuários");
  return `Até ${count} ${unit}`;
}

export function includedSeatsHeading(productKey: string): string {
  return productKey === "casa360" ? "Moradores inclusos" : "Usuários inclusos";
}
