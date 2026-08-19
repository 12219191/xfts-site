import { getStripeErrorMessage } from "@/lib/stripe.server";

export const DEMO_MESSAGE =
  "Esta é uma assinatura de demonstração, sem cobrança real vinculada ao provedor de pagamento. Faça uma assinatura real para usar esta ação.";

/** IDs reais do Stripe têm prefixo conhecido; o resto são registros de teste. */
export function isRealStripeId(
  id: string | null | undefined,
  prefix: "cus_" | "sub_",
): boolean {
  return typeof id === "string" && id.startsWith(prefix);
}

/** Traduz erros do Stripe, dando destaque ao caso de cadastro inexistente. */
export function friendlyStripeError(error: unknown): string {
  const raw = error as { code?: string; raw?: { code?: string } } | null;
  const code = raw?.raw?.code ?? raw?.code;
  if (code === "resource_missing") {
    return "Cadastro de cobrança não encontrado no provedor de pagamento. Refaça a assinatura para gerar um cadastro válido.";
  }
  return getStripeErrorMessage(error);
}
