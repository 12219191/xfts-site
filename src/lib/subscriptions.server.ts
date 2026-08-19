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

const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf",
]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);

/** Converte o valor do Stripe (menor unidade) para a unidade principal. */
export function toMajorUnit(amount: number | null | undefined, currency: string): number {
  const value = amount ?? 0;
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL.has(c)) return value;
  if (THREE_DECIMAL.has(c)) return value / 1000;
  return value / 100;
}
