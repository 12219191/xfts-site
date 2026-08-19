import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { CrmIntegrationSettings } from "@/lib/crm-settings";

const settingsSchema = z.object({
  enabled: z.boolean(),
  lead_url: z.string().max(500),
  auth_mode: z.enum(["hmac", "bearer", "api_key", "none"]),
  signature_header: z.string().max(80),
  signature_encoding: z.enum(["hex", "base64url"]).default("hex"),
  auth_header: z.string().max(80),
  auth_token: z.string().max(500),
  form_types: z.array(z.string().max(40)).max(10),
  timeout_ms: z.number().int().min(1000).max(30000),
  origem: z.string().max(60),
  field_map: z.record(z.string(), z.string().max(80)),
  response_lead_id_path: z.string().max(80),
  response_action_path: z.string().max(80),
});

export type CrmSettingsView = CrmIntegrationSettings & {
  /** Indica se existe uma chave de servidor (FLEXUS_APP_KEY_CRM) disponível. */
  has_server_key: boolean;
  updated_at: string | null;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

/** Lê a configuração atual da integração de leads com o CRM. */
export const getCrmSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CrmSettingsView> => {
    await assertAdmin(context);
    const { loadCrmSettings, CRM_SETTINGS_KEY } = await import("@/lib/crm-settings.server");
    const { appApiKey } = await import("@/lib/sso.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const settings = await loadCrmSettings();
    const { data } = await supabaseAdmin
      .from("integration_settings")
      .select("updated_at")
      .eq("key", CRM_SETTINGS_KEY)
      .maybeSingle();

    return {
      ...settings,
      // Nunca devolvemos o segredo salvo: só sinalizamos se existe.
      auth_token: settings.auth_token ? "********" : "",
      has_server_key: Boolean(appApiKey("crm")),
      updated_at: data?.updated_at ?? null,
    };
  });

/** Salva a configuração da integração — apenas administradores. */
export const saveCrmSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { loadCrmSettings, saveCrmSettings } = await import("@/lib/crm-settings.server");

    const current = await loadCrmSettings();
    // "********" significa "manter o segredo atual".
    const token = data.auth_token === "********" ? current.auth_token : data.auth_token;

    await saveCrmSettings({ ...data, auth_token: token }, context.userId);
    return { ok: true };
  });

/** Dispara um lead de teste com a configuração atual. */
export const testCrmConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      status: string;
      error: string | null;
      httpStatus: number | null;
      signatureEncoding: string;
      leadId: string | null;
    }> => {
      await assertAdmin(context);
      const { sendLeadToCrm } = await import("@/lib/crm-lead.server");
      const { loadCrmSettings } = await import("@/lib/crm-settings.server");

      const settings = await loadCrmSettings();
      const result = await sendLeadToCrm({
        reference_id: `TESTE-${Date.now()}`,
        form_type: settings.form_types[0] ?? "contato",
        nome: "Teste de integração XFTS",
        email: "teste-integracao@xfts.com.br",
        telefone: "+55 17 99794-3349",
        empresa: "XFTS",
        mensagem: "Lead de teste enviado pelo painel administrativo.",
        tela: "/admin",
      });

      return {
        status: result.status,
        error: result.error ?? null,
        httpStatus: result.httpStatus ?? null,
        signatureEncoding: result.signatureEncoding ?? settings.signature_encoding,
        leadId: result.leadId,
      };
    },
  );
