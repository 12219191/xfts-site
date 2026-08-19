export const DEMO_MESSAGE =
  "Esta é uma assinatura de demonstração, sem cobrança real vinculada ao provedor de pagamento. Faça uma assinatura real para usar esta ação.";

/** IDs reais do Stripe têm prefixo conhecido; o resto são registros de teste. */
export function isRealStripeId(
  id: string | null | undefined,
  prefix: "cus_" | "sub_",
): boolean {
  return typeof id === "string" && id.startsWith(prefix);
}
