import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const payloadSchema = z.object({
  form_type: z.enum(["contato", "demo"]),
  nome: z.string().max(120).optional(),
  email: z.string().max(255).optional(),
  telefone: z.string().max(40).optional(),
  segmento: z.string().max(60).optional(),
  empresa: z.string().max(120).optional(),
  mensagem: z.string().max(2000).optional(),
  motivo: z.string().max(2000).optional(),
  assunto: z.string().max(160).optional(),
  source: z.string().max(255).optional(),
});

export type ZapierPayload = z.infer<typeof payloadSchema>;

export const sendZapierWebhook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const webhookUrl = process.env["ZAPIER_WEBHOOK_URL"];

    if (!webhookUrl) {
      return {
        success: false,
        message:
          "Envio indisponível no momento. Fale conosco pelo WhatsApp ou por xfts@xfts.com.br.",
      };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        console.error("Zapier webhook failed with status", res.status);
        return {
          success: false,
          message: "Erro ao enviar mensagem. Tente novamente em instantes.",
        };
      }

      return {
        success: true,
        message: "Mensagem enviada com sucesso! Entraremos em contato em breve.",
      };
    } catch (error) {
      console.error("Zapier webhook error", error);
      return {
        success: false,
        message: "Erro ao enviar mensagem. Tente novamente em instantes.",
      };
    }
  });
