/** Resolução de papéis administrativos e verificação de permissão (server-only). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { MODULE_ROLES, type AdminModule, type AdminRole } from "@/lib/admin-rbac";

export interface AdminIdentity {
  userId: string;
  email: string;
  roles: AdminRole[];
}

/** Papéis do usuário. Admins legados (admin_users) sem papel viram superadmin. */
export async function loadAdminRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminRole[]> {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Falha ao consultar permissões administrativas: ${error.message}`);
  }
  const roles = ((data ?? []) as Array<{ role: AdminRole }>).map((r) => r.role);
  if (roles.length > 0) return roles;

  const { data: legacy } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return legacy ? ["superadmin"] : [];
}

export function hasModuleAccess(roles: AdminRole[], module: AdminModule): boolean {
  if (roles.includes("superadmin")) return true;
  return MODULE_ROLES[module].some((r) => roles.includes(r));
}

export class AdminAccessError extends Error {
  constructor(message = "Acesso negado") {
    super(message);
    this.name = "AdminAccessError";
  }
}

/** Garante que o chamador tem acesso ao módulo; devolve a identidade resolvida. */
export async function requireAdminModule(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  module: AdminModule,
): Promise<AdminIdentity> {
  const roles = await loadAdminRoles(supabase, userId);
  if (roles.length === 0) throw new AdminAccessError("Sua conta não é administradora.");
  if (!hasModuleAccess(roles, module)) {
    throw new AdminAccessError("Seu perfil não tem permissão para esta área.");
  }
  return { userId, email, roles };
}
