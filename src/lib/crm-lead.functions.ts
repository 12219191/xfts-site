import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const retrySchema = z.object({
  referenceId: z.string().min(3).max(60),
});

export type CrmRetryResult = {
  success: boolean;
  status: string;
  message: string;
};

/** Reenvia manualmente um protocolo ao CRM (apenas administradores). */
export const retryCrmLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => retrySchema.parse(input))
  .handler(async ({ data, context }): Promise<CrmRetryResult> => {
    const { data: adminRow } = await context.supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!adminRow) throw new Error("Acesso restrito a administradores.");

    const { data: row, error } = await context.supabase
      .from("form_submissions")
      .select("*")
      .eq("reference_id", data.referenceId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return { success: false, status: "failed", message: "Protocolo não encontrado." };

    const { rowToLeadInput, sendLeadToCrm } = await import("@/lib/crm-lead.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const result = await sendLeadToCrm(rowToLeadInput(row as Record<string, unknown>));

    await supabaseAdmin
      .from("form_submissions")
      .update({
        crm_status: result.status,
        crm_lead_id: result.leadId,
        crm_error: result.error ?? null,
        crm_synced_at: new Date().toISOString(),
        crm_attempts: ((row as { crm_attempts?: number }).crm_attempts ?? 0) + 1,
      })
      .eq("reference_id", data.referenceId);

    const ok = result.status === "created" || result.status === "updated";
    return {
      success: ok,
      status: result.status,
      message: ok
        ? result.status === "created"
          ? "Lead criado no CRM."
          : "Lead atualizado no CRM."
        : `Não foi possível enviar agora: ${result.error ?? "erro desconhecido"}.`,
    };
  });
