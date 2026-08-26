import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-rbac";

export interface TeamMember {
  userId: string;
  email: string;
  roles: AdminRole[];
}

type ListResult = { members: TeamMember[] } | { error: string };
type MutationResult = { ok: true } | { error: string };

/** Lista os administradores e seus papéis (somente superadmin). */
export const listAdminTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ListResult> => {
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(
        context.supabase,
        context.userId,
        (context.claims as { email?: string })?.email ?? "",
        "equipe",
      );
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }
    const { loadTeam } = await import("@/lib/admin-team.server");
    return { members: await loadTeam() };
  });

/** Concede um papel administrativo a um e-mail já cadastrado. */
export const grantAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; role: AdminRole }) => {
    if (!data?.email?.includes("@")) throw new Error("E-mail inválido");
    if (!ADMIN_ROLES.includes(data.role)) throw new Error("Papel inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const actorEmail = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, actorEmail, "equipe");
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }
    const { addRoleByEmail } = await import("@/lib/admin-team.server");
    const result = await addRoleByEmail(data.email, data.role, context.userId);
    if ("error" in result) return { error: result.error };

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: actorEmail,
      action: "team.role_granted",
      targetType: "user",
      targetId: result.userId,
      after: { email: data.email, role: data.role },
    });
    return { ok: true };
  });

/** Remove um papel administrativo. */
export const revokeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: AdminRole }) => {
    if (!data?.userId) throw new Error("Usuário inválido");
    if (!ADMIN_ROLES.includes(data.role)) throw new Error("Papel inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const actorEmail = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, actorEmail, "equipe");
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }
    if (data.userId === context.userId && data.role === "superadmin") {
      return { error: "Você não pode remover o seu próprio papel de superadmin." };
    }
    const { removeRole } = await import("@/lib/admin-team.server");
    const result = await removeRole(data.userId, data.role);
    if ("error" in result) return { error: result.error };

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: actorEmail,
      action: "team.role_revoked",
      targetType: "user",
      targetId: data.userId,
      before: { role: data.role },
    });
    return { ok: true };
  });
