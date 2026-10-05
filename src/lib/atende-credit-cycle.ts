// Ciclo de franquia de créditos do FLEXUS | Atende (contrato atende-credits-1).
// Mesmo objeto em entitlements, provisionamento e SSO. Puro e testável.
import { ACTIVE_STATUSES } from "@/lib/flexus-apps";

export const CREDIT_CYCLE_VERSION = "atende-credits-1" as const;

export type BillingInterval = "month" | "year";

export interface CreditCycleSub {
  id: string;
  status: string;
  environment: string;
  current_period_start: string | null;
  current_period_end: string | null;
  is_courtesy?: boolean | null;
  credit_anchor?: string | null;
}

export type CreditCycleReason =
  | "no_active_subscription"
  | "not_live"
  | "status_not_eligible"
  | "access_expired"
  | "anchor_unverified"
  | "interval_unknown";

export interface CreditCycle {
  version: typeof CREDIT_CYCLE_VERSION;
  subscription_id: string | null;
  anchor: string | null;
  billing_interval: BillingInterval | null;
  period_start: string | null;
  access_until: string | null;
  is_courtesy: boolean | null;
  eligible: boolean;
  reason: CreditCycleReason | null;
}

/** Intervalo pelo catálogo: só um plano casando, e só um dos lookups. */
export function intervalFromPlans(
  priceId: string,
  plans: Array<{ price_lookup_key: string | null; annual_lookup_key: string | null }>,
): BillingInterval | null {
  const hits = plans.filter(
    (p) => p.price_lookup_key === priceId || p.annual_lookup_key === priceId,
  );
  if (hits.length !== 1) return null;
  const p = hits[0]!;
  const m = p.price_lookup_key === priceId;
  const y = p.annual_lookup_key === priceId;
  if (m === y) return null;
  return m ? "month" : "year";
}

export function buildCreditCycle(
  sub: CreditCycleSub | null,
  interval: BillingInterval | null,
  now = Date.now(),
): CreditCycle {
  if (!sub) {
    return {
      version: CREDIT_CYCLE_VERSION, subscription_id: null, anchor: null, billing_interval: null,
      period_start: null, access_until: null, is_courtesy: null, eligible: false,
      reason: "no_active_subscription",
    };
  }
  const anchor = sub.credit_anchor ?? null;
  const until = sub.current_period_end;
  let reason: CreditCycleReason | null = null;
  if (sub.environment !== "live") reason = "not_live";
  else if (!(ACTIVE_STATUSES.includes(sub.status) || sub.status === "canceled")) reason = "status_not_eligible";
  else if (!until || new Date(until).getTime() <= now) reason = "access_expired";
  else if (!anchor || Number.isNaN(new Date(anchor).getTime())) reason = "anchor_unverified";
  else if (!interval) reason = "interval_unknown";
  return {
    version: CREDIT_CYCLE_VERSION,
    subscription_id: sub.id,
    anchor,
    billing_interval: interval,
    period_start: sub.current_period_start,
    access_until: until,
    is_courtesy: !!sub.is_courtesy,
    eligible: reason === null,
    reason,
  };
}
