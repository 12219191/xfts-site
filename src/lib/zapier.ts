import { sendZapierWebhook } from "@/lib/zapier.functions";

export async function sendToZapier(
  data: Record<string, string>,
  formType: "contato" | "demo"
): Promise<{ success: boolean; message: string }> {
  try {
    return await sendZapierWebhook({
      data: {
        ...data,
        form_type: formType,
        source: typeof window === "undefined" ? "" : window.location.origin,
      },
    });
  } catch {
    return {
      success: false,
      message: "Erro ao enviar mensagem. Tente novamente em instantes.",
    };
  }
}
