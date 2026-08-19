import { sendZapierWebhook, type ZapierResult } from "@/lib/zapier.functions";
import { getAttribution } from "@/lib/attribution";

export type { ZapierResult };

export function formatSentAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}

export async function sendToZapier(
  data: Record<string, string>,
  formType: "contato" | "demo",
  botao?: string
): Promise<ZapierResult> {
  const startedAt = Date.now();
  try {
    const attribution = getAttribution();
    const result = await sendZapierWebhook({
      data: {
        ...data,
        ...attribution,
        form_type: formType,
        botao: botao ?? "",
        tela: typeof window === "undefined" ? "" : window.location.pathname,
        source: typeof window === "undefined" ? "" : window.location.origin,
      },
    });
    console.log("[form:submit]", { formType, botao, ...result });
    return result;
  } catch (error) {
    const failure: ZapierResult = {
      success: false,
      message:
        "Erro ao enviar mensagem. Verifique sua conexão e tente novamente, ou escreva para xfts@xfts.com.br.",
      referenceId: "",
      sentAt: new Date().toISOString(),
      status: "network_error",
      durationMs: Date.now() - startedAt,
    };
    console.error("[form:submit] falha", { formType, botao, error, ...failure });
    return failure;
  }
}
