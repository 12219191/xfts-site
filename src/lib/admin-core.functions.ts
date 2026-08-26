import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AdminRole } from "@/lib/admin-rbac";

export interface AdminSession {
  userId: string;
  email: string;
  roles: AdminRole[];
}

/** Sessão administrativa do usuário logado (papéis efetivos). */
export const getAdminSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSession> => {
    const { loadAdminRoles } = await import("@/lib/admin-rbac.server");
    const roles = await loadAdminRoles(context.supabase, context.userId);
    return {
      userId: context.userId,
      email: (context.claims as { email?: string })?.email ?? "",
      roles,
    };
  });
