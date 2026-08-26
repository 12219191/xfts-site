import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before: string | null;
  after: string | null;
  reason: string | null;
  created_at: string;
}

type Result = { entries: AuditRow[] } | { error: string };

/** Histórico de ações administrativas, com filtros. */
export const listAdminAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { action?: string; actor?: string; days?: number }) => data ?? {})
  .handler(async ({ data, context }): Promise<Result> => {
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(
        context.supabase,
        context.userId,
        (context.claims as { email?: string })?.email ?? "",
        "auditoria",
      );
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }

    const since = new Date(Date.now() - (data.days ?? 30) * 24 * 60 * 60 * 1000).toISOString();
    let query = context.supabase
      .from("admin_audit_log")
      .select("id, actor_email, action, target_type, target_id, before, after, reason, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.action) query = query.eq("action", data.action);
    if (data.actor) query = query.ilike("actor_email", `%${data.actor}%`);

    const { data: rows, error } = await query;
    if (error) return { error: error.message };
    return {
      entries: (rows ?? []).map((r) => ({
        id: r.id,
        actor_email: r.actor_email,
        action: r.action,
        target_type: r.target_type,
        target_id: r.target_id,
        before: r.before === null ? null : JSON.stringify(r.before),
        after: r.after === null ? null : JSON.stringify(r.after),
        reason: r.reason,
        created_at: r.created_at,
      })),
    };
  });
