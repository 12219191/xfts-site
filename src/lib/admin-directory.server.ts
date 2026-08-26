/** Diretório de usuários (Auth Admin API) e cálculo de receita — server-only. */
import { PLANS_BY_APP } from "@/lib/product-plans";
import { appKeyFromPriceId, billingIntervalFromPriceId } from "@/lib/flexus-apps";

export interface DirectoryUser {
  id: string;
  email: string;
  created_at: string | null;
}

/** Mapa user_id -> e-mail (até 5 mil contas). */
export async function loadUserDirectory(): Promise<Map<string, DirectoryUser>> {
  const map = new Map<string, DirectoryUser>();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let page = 1; page <= 5; page++) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      const users = data?.users ?? [];
      for (const u of users) {
        map.set(u.id, { id: u.id, email: u.email ?? "", created_at: u.created_at ?? null });
      }
      if (users.length < 1000) break;
    }
  } catch {
    // e-mail é complementar
  }
  return map;
}

function parseBrl(value: string | undefined): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d,]/g, "").replace(",", ".");
  return Number(digits) || 0;
}

/** Receita mensal recorrente de um price_id (anual é dividido por 12). */
export function monthlyRevenueFromPriceId(priceId: string | null | undefined): number {
  const appKey = appKeyFromPriceId(priceId);
  if (!appKey || !priceId) return 0;
  const plans = PLANS_BY_APP[appKey] ?? [];
  const annual = billingIntervalFromPriceId(priceId) === "anual";
  for (const plan of plans) {
    if (!annual && plan.priceId === priceId) return parseBrl(plan.price);
    if (annual && plan.annualPriceId === priceId) return parseBrl(plan.annualPrice) / 12;
  }
  return 0;
}
