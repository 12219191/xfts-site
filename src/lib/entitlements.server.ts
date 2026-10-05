/**
 * Resolução dos entitlements (recursos + limites) de um usuário em um produto.
 * Fonte de verdade: catálogo no banco (catalog_plans.entitlements) cruzado com
 * a assinatura ativa. Serve o hub, o SSO, o provisionamento e a API pública.
 */
import {
  ACTIVE_STATUSES,
  appKeyFromPriceId,
  planTierFromPriceId,
  seatsFromPriceId,
} from "@/lib/flexus-apps";
// Import estático de propósito: com import dinâmico o bundler de produção
// deduzia que buildCreditCycle só recebia sub=null e removia o ramo positivo.
import { buildCreditCycle, intervalFromPlans } from "@/lib/atende-credit-cycle";
import {
  parseEntitlements,
  splitEntitlements,
  type EntitlementDefinition,
  type EntitlementMap,
  type ResolvedEntitlements,
} from "@/lib/entitlements";

interface DefinitionRow {
  id: string;
  product_key: string;
  key: string;
  label: string;
  kind: string;
  unit: string | null;
  description: string | null;
  sort_order: number;
}

export function mapDefinition(row: DefinitionRow): EntitlementDefinition {
  return {
    id: row.id,
    productKey: row.product_key,
    key: row.key,
    label: row.label,
    kind: row.kind === "limit" ? "limit" : "feature",
    unit: row.unit ?? "",
    description: row.description ?? "",
    sortOrder: row.sort_order ?? 0,
  };
}

/** Todas as definições (opcionalmente de um produto). */
export async function loadDefinitions(productKey?: string): Promise<EntitlementDefinition[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("entitlement_definitions")
    .select("*")
    .order("sort_order", { ascending: true });
  if (productKey) query = query.eq("product_key", productKey);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapDefinition(row as unknown as DefinitionRow));
}

interface PlanRow {
  name: string;
  tier: string;
  seats: number | null;
  price_lookup_key: string | null;
  annual_lookup_key: string | null;
  entitlements: unknown;
}

/** Plano do catálogo correspondente ao lookup key da assinatura. */
async function planForPrice(priceId: string | null | undefined): Promise<PlanRow | null> {
  if (!priceId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("catalog_plans")
    .select("name, tier, seats, price_lookup_key, annual_lookup_key, entitlements")
    .or(`price_lookup_key.eq.${priceId},annual_lookup_key.eq.${priceId}`)
    .limit(1)
    .maybeSingle();
  return (data as unknown as PlanRow | null) ?? null;
}

interface ResolveInput {
  priceId: string | null | undefined;
  status: string | null | undefined;
  currentPeriodEnd?: string | null;
  seatsOverride?: number | null;
}

/**
 * Monta os entitlements efetivos. Sem assinatura válida devolve tudo bloqueado,
 * garantindo que a aplicação nunca libere feature por omissão.
 */
export async function resolveEntitlements(
  input: ResolveInput,
): Promise<ResolvedEntitlements> {
  const productKey = appKeyFromPriceId(input.priceId) ?? "";
  const definitions = productKey ? await loadDefinitions(productKey) : [];

  const periodOk =
    !input.currentPeriodEnd || new Date(input.currentPeriodEnd).getTime() > Date.now();
  const status = input.status ?? "none";
  const ativo =
    !!input.priceId &&
    periodOk &&
    (ACTIVE_STATUSES.includes(status) || status === "canceled");

  const plan = await planForPrice(input.priceId);
  const map: EntitlementMap = plan ? parseEntitlements(plan.entitlements) : {};

  // Rede de segurança: sem entitlement de usuários no catálogo, usa o padrão do tier.
  if (map["usuarios"] === undefined) {
    map["usuarios"] = plan?.seats ?? seatsFromPriceId(input.priceId);
  }
  // Override manual de assentos (cortesia/negociação) sempre vence.
  if (input.seatsOverride !== undefined && input.seatsOverride !== null) {
    map["usuarios"] = input.seatsOverride;
  }

  const { features, limites } = splitEntitlements(map, definitions);

  if (!ativo) {
    for (const key of Object.keys(features)) features[key] = false;
    for (const key of Object.keys(limites)) limites[key] = 0;
  }

  return {
    productKey,
    ativo,
    status,
    plano: input.priceId ? planTierFromPriceId(input.priceId) : null,
    planoNome: plan?.name ?? null,
    features,
    limites,
    definicoes: definitions,
  };
}

/** Entitlements do usuário em um produto específico. */
export type AtendeRow = {
  id: string;
  current_period_start: string | null;
  credit_anchor: string | null;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
  is_courtesy: boolean | null;
  seats_used: number | null;
  seats_override: number | null;
};

/**
 * Fonte única da assinatura do FLEXUS | Atende (SSO, entitlements e
 * capability-check). Só ambiente "live" — nunca escolhido pelo navegador;
 * sandbox mais nova não libera acesso real. Ambíguo nega.
 */
export async function resolveAtendeLive(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveAtendeSubscription } = await import("@/lib/atende-sso");
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "id, price_id, status, current_period_start, current_period_end, cancel_at_period_end, environment, is_courtesy, seats_used, seats_override, credit_anchor",
    )
    .eq("user_id", userId)
    .eq("environment", "live");
  return resolveAtendeSubscription(
    (data ?? []) as unknown as AtendeRow[],
    "live",
    (p) => appKeyFromPriceId(p) === "atende",
  );
}

/**
 * credit_cycle (atende-credits-1) a partir da assinatura JÁ resolvida
 * (sem re-resolver). Falha ao ler o catálogo → intervalo desconhecido
 * (fail closed, sem detalhes do erro).
 */
export async function creditCycleForSub(sub: AtendeRow | null) {
  if (!sub) return buildCreditCycle(null, null);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("catalog_plans")
    .select("price_lookup_key, annual_lookup_key")
    .eq("product_key", "atende");
  if (error || !data) {
    console.error("credit_cycle: falha ao ler catálogo do Atende");
    return buildCreditCycle(sub, null);
  }
  return buildCreditCycle(sub, intervalFromPlans(sub.price_id, data));
}

/** Para o provisionamento: resolve UMA vez e monta o ciclo. */
export async function loadAtendeCreditCycle(userId: string) {
  const r = await resolveAtendeLive(userId);
  return creditCycleForSub(r.kind === "ok" ? r.sub : null);
}

export const ATENDE_DENIAL = {
  none: "Sem assinatura live ativa do FLEXUS | Atende.",
  ambiguous: "Mais de uma assinatura live ativa do FLEXUS | Atende; acesso negado até regularizar.",
} as const;

export async function resolveUserEntitlements(
  userId: string,
  productKey: string,
): Promise<
  ResolvedEntitlements & {
    seatsUsed: number;
    environment?: "live";
    denialReason?: string;
    /** Assinatura canônica do Atende usada nesta resolução (só app=atende). */
    atendeSub?: AtendeRow | null;
  }
> {
  if (productKey === "atende") {
    const r = await resolveAtendeLive(userId);
    const s = r.kind === "ok" ? r.sub : null;
    const resolved = await resolveEntitlements({
      priceId: s?.price_id ?? null,
      status: s?.status ?? "none",
      currentPeriodEnd: s?.current_period_end ?? null,
      seatsOverride: s?.seats_override ?? null,
    });
    return {
      ...resolved,
      productKey,
      definicoes: resolved.definicoes.length ? resolved.definicoes : await loadDefinitions(productKey),
      seatsUsed: s?.seats_used ?? 0,
      atendeSub: s,
      ...(r.kind === "ok"
        ? { environment: "live" as const }
        : { ativo: false, denialReason: ATENDE_DENIAL[r.kind] }),
    };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "price_id, status, current_period_end, cancel_at_period_end, seats_used, seats_override",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === productKey) as
    | {
        price_id: string;
        status: string;
        current_period_end: string | null;
        seats_used: number | null;
        seats_override: number | null;
      }
    | undefined;

  const resolved = await resolveEntitlements({
    priceId: sub?.price_id ?? null,
    status: sub?.status ?? "none",
    currentPeriodEnd: sub?.current_period_end ?? null,
    seatsOverride: sub?.seats_override ?? null,
  });

  return {
    ...resolved,
    productKey,
    definicoes: resolved.definicoes.length
      ? resolved.definicoes
      : await loadDefinitions(productKey),
    seatsUsed: sub?.seats_used ?? 0,
  };
}

/** Formato enxuto enviado aos sistemas FLEXUS (SSO, provisionamento, API). */
export function toWirePayload(ent: ResolvedEntitlements) {
  return {
    recursos: ent.features,
    limites: ent.limites,
  };
}
