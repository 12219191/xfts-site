import { getStripeErrorMessage } from "@/lib/stripe.server";

/** Traduz erros do Stripe, dando destaque ao caso de cadastro inexistente. */
export function friendlyStripeError(error: unknown): string {
  const raw = error as { code?: string; raw?: { code?: string } } | null;
  const code = raw?.raw?.code ?? raw?.code;
  if (code === "resource_missing") {
    return "Cadastro de cobrança não encontrado no provedor de pagamento. Refaça a assinatura para gerar um cadastro válido.";
  }
  return getStripeErrorMessage(error);
}
