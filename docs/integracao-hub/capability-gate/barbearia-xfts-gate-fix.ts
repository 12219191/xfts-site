/**
 * Patch específico do FLEXUS | Barbearia.
 *
 * Aplicar na função de servidor `xfts-gate`. O papel é lido da base do próprio
 * Barbearia depois de validar o JWT; nunca é recebido do navegador.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ActingAs = "TENANT" | "TENANT_ADMIN";

const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"]);

export async function resolveBarbeariaActingAs(
  admin: SupabaseClient,
  userId: string,
): Promise<ActingAs> {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  // Falha fechada: erro ou ausência de papel nunca eleva privilégios.
  if (error || !data) return "TENANT";

  return data.some((row) => ADMIN_ROLES.has(String(row.role).toLowerCase()))
    ? "TENANT_ADMIN"
    : "TENANT";
}

/*
 * Na função `xfts-gate/index.ts`, depois de validar `userData.user`:
 *
 *   const actingAs = await resolveBarbeariaActingAs(admin, userData.user.id);
 *
 * E propague `actingAs` nas três decisões:
 *
 *   if (capability) await requireCan(app, hub.hub_user_id, apiKey, capability, actingAs);
 *   else if (action) await requireAction(app, hub.hub_user_id, apiKey, action, actingAs);
 *   else await requireRoute(app, hub.hub_user_id, apiKey, path!, actingAs);
 *
 * No `_shared/xftsHub.ts`, adicione `actingAs: ActingAs` às assinaturas de
 * requireCan/requireRoute/requireAction e envie no corpo:
 *
 *   body: JSON.stringify({
 *     app,
 *     user_id: userId,
 *     capability,
 *     acting_as: actingAs,
 *   })
 */