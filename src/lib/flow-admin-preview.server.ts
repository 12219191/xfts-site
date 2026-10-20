import { FLOW_ADMIN_PREVIEW_FLAG } from "@/lib/flow-admin-preview";

export async function flowPreviewFlagOn(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("integration_settings").select("value").eq("key", FLOW_ADMIN_PREVIEW_FLAG).maybeSingle();
  return data?.value === true;
}

/** Conferido no servidor: a conta está em admin_users. */
export async function isControlCenterAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_users").select("id").eq("user_id", userId).maybeSingle();
  return !!data;
}
