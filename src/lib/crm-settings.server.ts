/** Leitura/escrita server-only da configuração da integração com o CRM. */
import {
  DEFAULT_CRM_SETTINGS,
  normalizeCrmSettings,
  type CrmIntegrationSettings,
} from "@/lib/crm-settings";
import { getFlexusApp } from "@/lib/flexus-apps";

export const CRM_SETTINGS_KEY = "crm_lead_integration";

/** Configuração efetiva: banco → padrão do código (leadUrl do catálogo FLEXUS). */
export async function loadCrmSettings(): Promise<CrmIntegrationSettings> {
  const fallbackUrl = getFlexusApp("crm")?.leadUrl ?? "";
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("integration_settings")
      .select("value")
      .eq("key", CRM_SETTINGS_KEY)
      .maybeSingle();

    const settings = normalizeCrmSettings(data?.value ?? {});
    return { ...settings, lead_url: settings.lead_url || fallbackUrl };
  } catch {
    return { ...DEFAULT_CRM_SETTINGS, lead_url: fallbackUrl };
  }
}

/** Grava a configuração (chamador precisa já ter validado que é admin). */
export async function saveCrmSettings(
  settings: CrmIntegrationSettings,
  userId: string,
): Promise<CrmIntegrationSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = normalizeCrmSettings(settings);
  const { error } = await supabaseAdmin.from("integration_settings").upsert({
    key: CRM_SETTINGS_KEY,
    value: normalized as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  });
  if (error) throw new Error(error.message);
  return normalized;
}
