import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminSubscriptionEvent {
  id: string;
  event_type: string;
  price_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface AdminSubscriptionRow {
  id: string;
  user_id: string;
  email: string | null;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  created_at: string | null;
  updated_at: string | null;
  events: AdminSubscriptionEvent[];
}

type Result = { subscriptions: AdminSubscriptionRow[] } | { error: string };

/**
 * Painel administrativo: lista todas as assinaturas (ativas, canceladas,
 * com falha de pagamento) com o e-mail do cliente e o histórico de ações
 * de plano. Somente administradores (tabela admin_users) têm acesso.
 */
export const getAdminSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Result> => {
    const { supabase, userId } = context;

    // Verifica permissão de admin com o cliente do próprio usuário (RLS).
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!adminRow) return { error: "Acesso negado" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: subs, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return { error: error.message };

    const { data: events } = await supabaseAdmin
      .from("subscription_events")
      .select("id, user_id, stripe_subscription_id, event_type, price_id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);

    const eventsBySub = new Map<string, AdminSubscriptionEvent[]>();
    for (const ev of events ?? []) {
      const key = ev.stripe_subscription_id ?? "";
      if (!key) continue;
      const list = eventsBySub.get(key) ?? [];
      list.push({
        id: ev.id,
        event_type: ev.event_type,
        price_id: ev.price_id,
        reason: ev.reason,
        created_at: ev.created_at,
      });
      eventsBySub.set(key, list);
    }

    // Resolve e-mails dos clientes via Auth Admin API.
    const emailByUser = new Map<string, string>();
    try {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of usersPage?.users ?? []) {
        if (u.email) emailByUser.set(u.id, u.email);
      }
    } catch {
      // e-mail é informação complementar; segue sem ele em caso de falha
    }

    return {
      subscriptions: (subs ?? []).map((s) => ({
        id: s.id,
        user_id: s.user_id,
        email: emailByUser.get(s.user_id) ?? null,
        stripe_subscription_id: s.stripe_subscription_id,
        stripe_customer_id: s.stripe_customer_id,
        product_id: s.product_id,
        price_id: s.price_id,
        status: s.status,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        cancel_at_period_end: s.cancel_at_period_end ?? false,
        environment: s.environment,
        created_at: s.created_at,
        updated_at: s.updated_at,
        events: eventsBySub.get(s.stripe_subscription_id) ?? [],
      })),
    };
  });
