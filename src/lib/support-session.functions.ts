import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SupportOverview {
  flags: Array<{ app: string; name: string; enabled: boolean }>;
  sessions: Array<{
    id: string;
    actor_email: string;
    actor_name: string;
    role: string;
    tenant_id: string;
    tenant_email: string;
    app_key: string;
    reason: string;
    ticket: string | null;
    state: string;
    token_expires_at: string;
    session_expires_at: string | null;
    created_at: string;
  }>;
  canManageFlags: boolean;
}

async function guard(context: { supabase: never; userId: string; claims: unknown }) {
  const email = (context.claims as { email?: string })?.email ?? "";
  const { requireAdminModule } = await import("@/lib/admin-rbac.server");
  const identity = await requireAdminModule(context.supabase, context.userId, email, "clientes");
  return { ...identity, email };
}

/** Fluxo de suporte de cada app e sessões ativas. */
export const getSupportOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupportOverview | { error: string }> => {
    try {
      const id = await guard(context as never);
      const { supportFlags, listOpenSessions } = await import("@/lib/support-session.server");
      const { FLEXUS_APPS } = await import("@/lib/flexus-apps");
      const { loadUserDirectory } = await import("@/lib/admin-directory.server");
      const [flags, sessions, dir] = await Promise.all([supportFlags(), listOpenSessions(), loadUserDirectory()]);
      return {
        canManageFlags: id.roles.includes("superadmin"),
        flags: FLEXUS_APPS.filter((a) => a.url).map((a) => ({ app: a.key, name: a.name, enabled: flags[a.key] === true })),
        sessions: sessions.map((s) => ({
          id: s.id,
          actor_email: s.actor_email,
          actor_name: s.actor_name,
          role: s.role,
          tenant_id: s.tenant_id,
          tenant_email: dir.get(s.tenant_id)?.email ?? s.tenant_id,
          app_key: s.app_key,
          reason: s.reason,
          ticket: s.ticket,
          state: s.state,
          token_expires_at: s.token_expires_at,
          session_expires_at: s.session_expires_at,
          created_at: s.created_at,
        })),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }
  });

export const revokeSupportSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) => {
    if (!d?.id) throw new Error("Sessão inválida");
    if (!d.reason || d.reason.trim().length < 5) throw new Error("Informe o motivo (mínimo 5 caracteres).");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const id = await guard(context as never);
      const { revokeSupportSession } = await import("@/lib/support-session.server");
      return await revokeSupportSession(data.id, { id: id.userId, email: id.email }, data.reason.trim());
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }
  });

/** Liga/desliga a Sessão de Suporte XFTS por app (somente superadmin, auditado). */
export const setSupportSessionFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { app: string; enabled: boolean }) => {
    if (!d?.app || typeof d.enabled !== "boolean") throw new Error("Dados inválidos");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const id = await guard(context as never);
      if (!id.roles.includes("superadmin")) return { error: "Só superadmin altera o fluxo de suporte." };
      const { setSupportFlag } = await import("@/lib/support-session.server");
      await setSupportFlag(data.app, data.enabled, { id: id.userId, email: id.email });
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Falha ao salvar" };
    }
  });
