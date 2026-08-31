import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditJson =
  | string
  | number
  | boolean
  | null
  | AuditJson[]
  | { [key: string]: AuditJson };

export interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before: AuditJson;
  after: AuditJson;
  reason: string | null;
  created_at: string;
}

export interface SupportSessionRow {
  id: string;
  app_key: string;
  customer_email: string | null;
  admin_email: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  reason: string | null;
}

type Result = { entries: AuditRow[] } | { error: string };

async function guard(context: { supabase: unknown; userId: string; claims: unknown }) {
  const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
  try {
    await requireAdminModule(
      context.supabase as never,
      context.userId,
      (context.claims as { email?: string })?.email ?? "",
      "auditoria",
    );
    return null;
  } catch (e) {
    if (e instanceof AdminAccessError) return e.message;
    throw e;
  }
}

/** Histórico de ações administrativas, com filtros. */
export const listAdminAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { action?: string; actor?: string; days?: number; targetId?: string }) => data ?? {},
  )
  .handler(async ({ data, context }): Promise<Result> => {
    const denied = await guard(context);
    if (denied) return { error: denied };

    const since = new Date(Date.now() - (data.days ?? 30) * 24 * 60 * 60 * 1000).toISOString();
    let query = context.supabase
      .from("admin_audit_log")
      .select("id, actor_email, action, target_type, target_id, before, after, reason, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.action) query = query.ilike("action", `%${data.action}%`);
    if (data.actor) query = query.ilike("actor_email", `%${data.actor}%`);
    if (data.targetId) query = query.eq("target_id", data.targetId);

    const { data: rows, error } = await query;
    if (error) return { error: error.message };
    return { entries: (rows ?? []) as AuditRow[] };
  });

/** Sessões de acesso de suporte emitidas (SSO com propósito "support"). */
export const listSupportSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { days?: number }) => data ?? {})
  .handler(
    async ({ data, context }): Promise<{ sessions: SupportSessionRow[] } | { error: string }> => {
      const denied = await guard(context);
      if (denied) return { error: denied };

      const since = new Date(Date.now() - (data.days ?? 30) * 24 * 60 * 60 * 1000).toISOString();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: tokens, error } = await supabaseAdmin
        .from("sso_tokens")
        .select("id, user_id, app_key, created_at, expires_at, used_at, created_by_admin")
        .eq("purpose", "support")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return { error: error.message };

      const { data: audit } = await supabaseAdmin
        .from("admin_audit_log")
        .select("target_id, reason, created_at, actor_email")
        .eq("action", "support.impersonation")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      const { loadUserDirectory } = await import("@/lib/admin-directory.server");
      const directory = await loadUserDirectory();

      const sessions = (tokens ?? []).map((t) => {
        const match = (audit ?? []).find(
          (a) =>
            a.target_id === t.user_id &&
            Math.abs(new Date(a.created_at).getTime() - new Date(t.created_at).getTime()) < 60_000,
        );
        return {
          id: t.id,
          app_key: t.app_key,
          customer_email: directory.get(t.user_id)?.email ?? null,
          admin_email:
            match?.actor_email ??
            (t.created_by_admin ? (directory.get(t.created_by_admin)?.email ?? null) : null),
          created_at: t.created_at,
          expires_at: t.expires_at,
          used_at: t.used_at,
          reason: match?.reason ?? null,
        };
      });

      return { sessions };
    },
  );
