/** Clientes, entitlements e acesso de suporte (server-only). */
import {
  ACTIVE_STATUSES,
  appKeyFromPriceId,
  billingIntervalFromPriceId,
  getFlexusApp,
  planTierFromPriceId,
  seatsFromPriceId,
} from "@/lib/flexus-apps";
import { loadUserDirectory } from "@/lib/admin-directory.server";

export interface CustomerProduct {
  subscriptionId: string;
  app: string;
  appName: string;
  plano: string;
  ciclo: string;
  status: string;
  isCourtesy: boolean;
  priceId: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  seatsLimit: number | null;
  seatsOverride: number | null;
  seatsUsed: number | null;
  ativo: boolean;
}

export interface CustomerRow {
  userId: string;
  email: string;
  createdAt: string | null;
  produtos: CustomerProduct[];
}

function toProduct(s: {
  id: string;
  price_id: string;
  status: string;
  is_courtesy: boolean | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  seats_used: number | null;
  seats_override: number | null;
}): CustomerProduct {
  const appKey = appKeyFromPriceId(s.price_id) ?? "outros";
  const periodOk =
    !s.current_period_end || new Date(s.current_period_end).getTime() > Date.now();
  return {
    subscriptionId: s.id,
    app: appKey,
    appName: getFlexusApp(appKey)?.name ?? "Outros",
    plano: planTierFromPriceId(s.price_id),
    ciclo: billingIntervalFromPriceId(s.price_id),
    status: s.status,
    isCourtesy: s.is_courtesy ?? false,
    priceId: s.price_id,
    currentPeriodEnd: s.current_period_end,
    cancelAtPeriodEnd: s.cancel_at_period_end ?? false,
    seatsLimit: s.seats_override ?? seatsFromPriceId(s.price_id),
    seatsOverride: s.seats_override,
    seatsUsed: s.seats_used,
    ativo: periodOk && (ACTIVE_STATUSES.includes(s.status) || s.status === "canceled"),
  };
}

export async function searchCustomers(
  search: string,
  environment: string,
): Promise<CustomerRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "id, user_id, price_id, status, is_courtesy, current_period_end, cancel_at_period_end, seats_used, seats_override, created_at",
    )
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1000);

  const directory = await loadUserDirectory();
  const term = search.trim().toLowerCase();
  const byUser = new Map<string, CustomerRow>();

  for (const s of subs ?? []) {
    const user = directory.get(s.user_id);
    const email = user?.email ?? "";
    if (term && !email.toLowerCase().includes(term) && !s.user_id.includes(term)) continue;
    const row =
      byUser.get(s.user_id) ??
      ({
        userId: s.user_id,
        email: email || s.user_id,
        createdAt: user?.created_at ?? null,
        produtos: [],
      } satisfies CustomerRow);
    row.produtos.push(toProduct(s));
    byUser.set(s.user_id, row);
  }

  return [...byUser.values()].slice(0, 200);
}

/** Entitlements efetivos — mesmo formato que os sistemas FLEXUS recebem. */
export function entitlementsFor(product: CustomerProduct) {
  return {
    ativo: product.ativo,
    status: product.status,
    plano: product.plano,
    papel: "owner",
    limite_usuarios: product.ativo ? product.seatsLimit : 0,
    usuarios_em_uso: product.seatsUsed ?? 0,
    acesso_ate: product.currentPeriodEnd,
    cancelamento_agendado: product.cancelAtPeriodEnd,
  };
}

export async function setSeatsOverride(
  subscriptionId: string,
  seats: number | null,
): Promise<{ before: unknown; after: unknown } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: current } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, price_id, seats_override")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!current) return { error: "Assinatura não encontrada" };

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ seats_override: seats, updated_at: new Date().toISOString() } as never)
    .eq("id", subscriptionId);
  if (error) return { error: error.message };

  return {
    before: { limite_usuarios: current.seats_override ?? seatsFromPriceId(current.price_id) },
    after: { limite_usuarios: seats ?? seatsFromPriceId(current.price_id) },
  };
}

/** Gera um acesso de suporte (token SSO curto, uso único) para o sistema alvo. */
export async function createSupportAccess(params: {
  userId: string;
  email: string;
  app: string;
  adminId: string;
}): Promise<{ url: string } | { error: string }> {
  const app = getFlexusApp(params.app);
  if (!app || !app.url) return { error: "Sistema não disponível para acesso de suporte." };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("price_id, status, current_period_end")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false });

  const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
  if (!sub) return { error: `Este cliente não tem assinatura do ${app.name}.` };

  const { signSsoToken } = await import("@/lib/sso.server");
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 300;

  const { error } = await supabaseAdmin.from("sso_tokens").insert({
    jti,
    user_id: params.userId,
    app_key: app.key,
    expires_at: new Date(exp * 1000).toISOString(),
    purpose: "support",
    created_by_admin: params.adminId,
  } as never);
  if (error) return { error: "Não foi possível gerar o acesso de suporte." };

  const token = await signSsoToken({
    sub: params.userId,
    email: params.email,
    app: app.key as never,
    plan: planTierFromPriceId(sub.price_id),
    role: "owner",
    seats: seatsFromPriceId(sub.price_id),
    jti,
    iat: now,
    exp,
    purpose: "support",
  } as never);

  return { url: `${app.url}/sso?token=${encodeURIComponent(token)}` };
}
