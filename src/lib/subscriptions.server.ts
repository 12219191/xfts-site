import { getStripeErrorMessage } from "@/lib/stripe.server";

export interface SubscriptionRecord {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  price_id: string;
  status: string;
  environment: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  seats_used: number | null;
}

/**
 * Resolve QUAL assinatura a ação deve afetar.
 *
 * O usuário pode assinar vários sistemas FLEXUS ao mesmo tempo, então toda
 * ação de conta precisa dizer explicitamente em qual assinatura opera.
 * Sem `subscriptionId` cai no comportamento antigo (a mais recente), apenas
 * para compatibilidade quando existe uma única assinatura.
 */
export async function resolveSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  environment: string,
  subscriptionId?: string,
): Promise<SubscriptionRecord | null> {
  let query = supabase
    .from("subscriptions")
    .select(
      "id, stripe_subscription_id, stripe_customer_id, price_id, status, environment, current_period_end, cancel_at_period_end, seats_used",
    )
    .eq("user_id", userId)
    .eq("environment", environment);

  if (subscriptionId) query = query.eq("stripe_subscription_id", subscriptionId);

  const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as SubscriptionRecord | null) ?? null;
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
