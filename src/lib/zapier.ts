import { sendZapierWebhook, type ZapierResult } from "@/lib/zapier.functions";

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
  formType: "contato" | "demo"
): Promise<ZapierResult> {
  const startedAt = Date.now();
  try {
    const result = await sendZapierWebhook({
      data: {
        ...data,
        form_type: formType,
        tela: typeof window === "undefined" ? "" : window.location.pathname,
        source: typeof window === "undefined" ? "" : window.location.origin,
      },
    });
    console.log("[form:submit]", { formType, ...result });
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
    console.error("[form:submit] falha", { formType, error, ...failure });
    return failure;
  }
}
