import type { ProductPlan } from "@/lib/product-plans";

/** Limite comercial deve vir do catálogo, nunca de tabelas históricas por tier.
 * Valores nulos ou ausentes não provam capacidade ilimitada. */
export function includedSeatsLabel(plan: Pick<ProductPlan, "seats"> | null | undefined, productKey: string): string {
  if (!plan || typeof plan.seats !== "number" || !Number.isInteger(plan.seats) || plan.seats < 0) {
    return "Sob consulta";
  }
  const unit = productKey === "casa360" ? (plan.seats === 1 ? "morador" : "moradores") : (plan.seats === 1 ? "usuário" : "usuários");
  return `Até ${plan.seats} ${unit}`;
}

export function includedSeatsHeading(productKey: string): string {
  return productKey === "casa360" ? "Moradores inclusos" : "Usuários inclusos";
}
