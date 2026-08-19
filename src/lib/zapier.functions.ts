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
  utm_source: utmField,
  utm_medium: utmField,
  utm_campaign: utmField,
  utm_term: utmField,
  utm_content: utmField,
  gclid: clickIdField,
  fbclid: clickIdField,
  referrer: urlField,
  landing_page: urlField,
  lt_utm_source: utmField,
  lt_utm_medium: utmField,
  lt_utm_campaign: utmField,
  lt_utm_term: utmField,
  lt_utm_content: utmField,
  lt_gclid: clickIdField,
  lt_fbclid: clickIdField,
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
          utm_campaign: data.utm_campaign ?? "",
          source: data.source ?? "",
          status,
          durationMs: Date.now() - startedAt,
          ...extra,
        })
      );
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("form_submissions").insert({
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
          utm_source: data.utm_source ?? null,
          utm_medium: data.utm_medium ?? null,
          utm_campaign: data.utm_campaign ?? null,
          utm_term: data.utm_term ?? null,
          utm_content: data.utm_content ?? null,
          gclid: data.gclid ?? null,
          fbclid: data.fbclid ?? null,
          referrer: data.referrer ?? null,
          landing_page: data.landing_page ?? null,
          lt_utm_source: data.lt_utm_source ?? null,
          lt_utm_medium: data.lt_utm_medium ?? null,
          lt_utm_campaign: data.lt_utm_campaign ?? null,
          lt_utm_term: data.lt_utm_term ?? null,
          lt_utm_content: data.lt_utm_content ?? null,
          lt_gclid: data.lt_gclid ?? null,
          lt_fbclid: data.lt_fbclid ?? null,
          lt_referrer: data.lt_referrer ?? null,
          lt_landing_page: data.lt_landing_page ?? null,
          error_message: extra.errorMessage ?? null,
          created_at: sentAt,
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
