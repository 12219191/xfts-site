/** Gestão da equipe administrativa (server-only). */
import type { AdminRole } from "@/lib/admin-rbac";
import { loadUserDirectory } from "@/lib/admin-directory.server";

export interface TeamMemberRow {
  userId: string;
  email: string;
  roles: AdminRole[];
}

export async function loadTeam(): Promise<TeamMemberRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: roleRows }, { data: legacy }] = await Promise.all([
    supabaseAdmin.from("admin_roles").select("user_id, role"),
    supabaseAdmin.from("admin_users").select("user_id"),
  ]);

  const directory = await loadUserDirectory();
  const byUser = new Map<string, TeamMemberRow>();

  for (const row of legacy ?? []) {
    byUser.set(row.user_id, {
      userId: row.user_id,
      email: directory.get(row.user_id)?.email ?? row.user_id,
      roles: [],
    });
  }
  for (const row of roleRows ?? []) {
    const entry =
      byUser.get(row.user_id) ??
      ({
        userId: row.user_id,
        email: directory.get(row.user_id)?.email ?? row.user_id,
        roles: [],
      } satisfies TeamMemberRow);
    entry.roles.push(row.role as AdminRole);
    byUser.set(row.user_id, entry);
  }

  return [...byUser.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export async function addRoleByEmail(
  email: string,
  role: AdminRole,
  createdBy: string,
): Promise<{ userId: string } | { error: string }> {
  const target = email.trim().toLowerCase();
  const directory = await loadUserDirectory();
  const found = [...directory.values()].find((u) => u.email.toLowerCase() === target);
  if (!found) {
    return { error: "Nenhuma conta com este e-mail. Peça para a pessoa criar a conta primeiro." };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("admin_roles")
    .upsert(
      [{ user_id: found.id, role, created_by: createdBy }] as never,
      { onConflict: "user_id,role" },
    );
  if (error) return { error: error.message };
  return { userId: found.id };
}

export async function removeRole(
  userId: string,
  role: AdminRole,
): Promise<{ ok: true } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("admin_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) return { error: error.message };
  // Sem papéis restantes, remove também o registro legado para que o
  // fallback (admin_users → superadmin) não devolva o acesso revogado.
  const { count, error: countError } = await supabaseAdmin
    .from("admin_roles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) return { error: countError.message };
  if (!count) {
    const { error: legacyError } = await supabaseAdmin
      .from("admin_users")
      .delete()
      .eq("user_id", userId);
    if (legacyError) return { error: legacyError.message };
  }
  return { ok: true };
}
