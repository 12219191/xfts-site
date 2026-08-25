import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface WebhookEventRow {
  id: string;
  stripe_event_id: string | null;
  event_type: string;
  environment: string;
  status: string;
  error: string | null;
  duration_ms: number;
  summary: Record<string, string | number | boolean | null> | null;
  created_at: string;
}

export interface WebhookEventsResult {
  rows: WebhookEventRow[];
  stats: {
    total24h: number;
    failed24h: number;
    ignored24h: number;
    avgDuration: number;
    lastEventAt: string | null;
    lastFailureAt: string | null;
  };
}

async function assertAdmin(context: {
  supabase: { from: (t: string) => any };
  userId: string;
}) {
  const { data } = await context.supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores.");
}

type ListInput = {
  environment?: "sandbox" | "live" | "todos";
  status?: "processed" | "ignored" | "failed" | "todos";
  eventType?: string;
  limit?: number;
};

/** Lista os últimos eventos recebidos do Stripe, com indicadores de saúde. */
export const listWebhookEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ListInput | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<WebhookEventsResult | { error: string }> => {
    try {
      await assertAdmin(context as never);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("webhook_events")
      .select(
        "id, stripe_event_id, event_type, environment, status, error, duration_ms, summary, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 300));

    if (data.environment && data.environment !== "todos") {
      query = query.eq("environment", data.environment);
    }
    if (data.status && data.status !== "todos") {
      query = query.eq("status", data.status);
    }
    if (data.eventType) {
      query = query.ilike("event_type", `%${data.eventType}%`);
    }

    const { data: rows, error } = await query;
    if (error) return { error: error.message };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("webhook_events")
      .select("status, duration_ms, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    const recentRows = (recent ?? []) as { status: string; duration_ms: number; created_at: string }[];
    const failed = recentRows.filter((r) => r.status === "failed");

    const { data: lastFail } = await supabaseAdmin
      .from("webhook_events")
      .select("created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      rows: (rows ?? []) as unknown as WebhookEventRow[],
      stats: {
        total24h: recentRows.length,
        failed24h: failed.length,
        ignored24h: recentRows.filter((r) => r.status === "ignored").length,
        avgDuration: recentRows.length
          ? Math.round(
              recentRows.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / recentRows.length,
            )
          : 0,
        lastEventAt: recentRows[0]?.created_at ?? null,
        lastFailureAt: (lastFail as { created_at?: string } | null)?.created_at ?? null,
      },
    };
  });
