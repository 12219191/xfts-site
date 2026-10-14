import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  normalizeClickId,
  normalizeUrlValue,
  normalizeUtmValue,
} from "@/lib/utm-normalize";

const utmField = z
  .string()
  .max(300)
  .optional()
  .transform((v) => normalizeUtmValue(v));
const clickIdField = z
  .string()
  .max(400)
  .optional()
  .transform((v) => normalizeClickId(v));
const urlField = z
  .string()
  .max(600)
  .optional()
  .transform((v) => normalizeUrlValue(v));


const payloadSchema = z.object({
  form_type: z.enum(["contato", "demo"]),
  tela: z.string().max(120).optional(),
  nome: z.string().max(120).optional(),
  email: z.string().max(255).optional(),
  telefone: z.string().max(40).optional(),
  segmento: z.string().max(60).optional(),
  empresa: z.string().max(120).optional(),
  mensagem: z.string().max(2000).optional(),
  motivo: z.string().max(2000).optional(),
  assunto: z.string().max(160).optional(),
  source: z.string().max(255).optional(),
  botao: z.string().max(80).optional(),
  cta_id: z.string().max(120).optional(),
  cta_label: z.string().max(120).optional(),
  cta_page: z.string().max(80).optional(),
  cta_placement: z.string().max(40).optional(),
  utm_source: utmField,
  utm_medium: utmField,
  utm_campaign: utmField,
  utm_term: utmField,
  utm_content: utmField,
  gclid: clickIdField,
  gbraid: clickIdField,
  wbraid: clickIdField,
  fbclid: clickIdField,
  li_fat_id: clickIdField,
  fbc: clickIdField,
  fbp: clickIdField,
  referrer: urlField,
  landing_page: urlField,
  lt_utm_source: utmField,
  lt_utm_medium: utmField,
  lt_utm_campaign: utmField,
  lt_utm_term: utmField,
  lt_utm_content: utmField,
  lt_gclid: clickIdField,
  lt_gbraid: clickIdField,
  lt_wbraid: clickIdField,
  lt_fbclid: clickIdField,
  lt_li_fat_id: clickIdField,
  lt_referrer: urlField,
  lt_landing_page: urlField,
});

export type ZapierPayload = z.infer<typeof payloadSchema>;

export type ZapierResult = {
  success: boolean;
  message: string;
  referenceId: string;
  sentAt: string;
  status: "sent" | "not_configured" | "rejected" | "network_error";
  httpStatus?: number;
  durationMs: number;
};

export const sendZapierWebhook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ data }): Promise<ZapierResult> => {
    const startedAt = Date.now();
    const sentAt = new Date().toISOString();
    const referenceId = `XF-${sentAt.slice(2, 10).replace(/-/g, "")}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    const webhookUrl = process.env["ZAPIER_WEBHOOK_URL"];

    const record = async (
      status: string,
      extra: { httpStatus?: number; errorMessage?: string } = {}
    ) => {
      console.log(
        JSON.stringify({
          scope: "zapier_webhook",
          referenceId,
          form_type: data.form_type,
          tela: data.tela ?? "",
          botao: data.botao ?? "",
          cta_id: data.cta_id ?? "",
          cta_placement: data.cta_placement ?? "",
          utm_campaign: data.utm_campaign ?? "",
          source: data.source ?? "",
          status,
          durationMs: Date.now() - startedAt,
          ...extra,
        })
      );
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const {
          rowToLeadInput,
          sendLeadToCrm,
          shouldSendToCrm,
        } = await import("@/lib/crm-lead.server");

        const row = {
          reference_id: referenceId,
          form_type: data.form_type,
          tela: data.tela ?? "",
          status,
          http_status: extra.httpStatus ?? null,
          duration_ms: Date.now() - startedAt,
          nome: data.nome ?? null,
          email: data.email ?? null,
          telefone: data.telefone ?? null,
          segmento: data.segmento ?? null,
          empresa: data.empresa ?? null,
          assunto: data.assunto ?? null,
          mensagem: data.mensagem ?? data.motivo ?? null,
          source: data.source ?? null,
          botao: data.botao || null,
          cta_id: data.cta_id || null,
          cta_label: data.cta_label || null,
          cta_page: data.cta_page || null,
          cta_placement: data.cta_placement || null,
          utm_source: data.utm_source ?? null,
          utm_medium: data.utm_medium ?? null,
          utm_campaign: data.utm_campaign ?? null,
          utm_term: data.utm_term ?? null,
          utm_content: data.utm_content ?? null,
          gclid: data.gclid ?? null,
          gbraid: data.gbraid ?? null,
          wbraid: data.wbraid ?? null,
          fbclid: data.fbclid ?? null,
          li_fat_id: data.li_fat_id ?? null,
          fbc: data.fbc ?? null,
          fbp: data.fbp ?? null,
          referrer: data.referrer ?? null,
          landing_page: data.landing_page ?? null,
          lt_utm_source: data.lt_utm_source ?? null,
          lt_utm_medium: data.lt_utm_medium ?? null,
          lt_utm_campaign: data.lt_utm_campaign ?? null,
          lt_utm_term: data.lt_utm_term ?? null,
          lt_utm_content: data.lt_utm_content ?? null,
          lt_gclid: data.lt_gclid ?? null,
          lt_gbraid: data.lt_gbraid ?? null,
          lt_wbraid: data.lt_wbraid ?? null,
          lt_fbclid: data.lt_fbclid ?? null,
          lt_li_fat_id: data.lt_li_fat_id ?? null,
          lt_referrer: data.lt_referrer ?? null,
          lt_landing_page: data.lt_landing_page ?? null,
          error_message: extra.errorMessage ?? null,
          created_at: sentAt,
        };

        // Leads comerciais vão direto para o FLEXUS | CRM (criar ou atualizar).
        const crm = shouldSendToCrm(data.form_type)
          ? await sendLeadToCrm(rowToLeadInput(row))
          : { status: "skipped" as const, leadId: null, error: undefined as string | undefined };

        console.log(
          JSON.stringify({
            scope: "crm_lead",
            referenceId,
            crm_status: crm.status,
            crm_error: crm.error ?? null,
          })
        );

        await supabaseAdmin.from("form_submissions").insert({
          ...row,
          crm_status: crm.status,
          crm_lead_id: crm.leadId,
          crm_error: crm.error ?? null,
          crm_synced_at: crm.status === "skipped" ? null : new Date().toISOString(),
          crm_attempts: crm.status === "skipped" ? 0 : 1,
        });
      } catch (persistError) {
        console.error("zapier_webhook persist failed", persistError);
      }
    };

    if (!webhookUrl) {
      await record("not_configured");
      return {
        success: false,
        message:
          "Envio indisponível no momento. Fale conosco pelo WhatsApp ou por xfts@xfts.com.br.",
        referenceId,
        sentAt,
        status: "not_configured",
        durationMs: Date.now() - startedAt,
      };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          reference_id: referenceId,
          timestamp: sentAt,
        }),
      });

      if (!res.ok) {
        await record("rejected", { httpStatus: res.status });
        return {
          success: false,
          message: `Não foi possível concluir o envio (código ${res.status}). Tente novamente ou escreva para xfts@xfts.com.br informando o protocolo ${referenceId}.`,
          referenceId,
          sentAt,
          status: "rejected",
          httpStatus: res.status,
          durationMs: Date.now() - startedAt,
        };
      }

      await record("sent", { httpStatus: res.status });
      return {
        success: true,
        message: "Mensagem enviada com sucesso! Entraremos em contato em breve.",
        referenceId,
        sentAt,
        status: "sent",
        httpStatus: res.status,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await record("network_error", { errorMessage });
      return {
        success: false,
        message: `Falha de conexão ao enviar. Tente novamente em instantes (protocolo ${referenceId}).`,
        referenceId,
        sentAt,
        status: "network_error",
        durationMs: Date.now() - startedAt,
      };
    }
  });
