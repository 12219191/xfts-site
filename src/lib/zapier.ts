import { sendZapierWebhook, type ZapierResult } from "@/lib/zapier.functions";
import { getAttributionPayload } from "@/lib/attribution";
import { getLastCtaClick } from "@/lib/tracking";
import { currentPage } from "@/lib/page-registry";

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
    const attribution = getAttributionPayload();
    const lastCta = getLastCtaClick();
    const page = typeof window === "undefined" ? null : currentPage();
    const result = await sendZapierWebhook({
      data: {
        ...data,
        ...attribution,
        form_type: formType,
        botao: botao ?? "",
        cta_id: lastCta?.cta_id ?? "",
        cta_label: lastCta?.cta_label ?? "",
        cta_page: lastCta?.cta_page ?? "",
        cta_placement: lastCta?.cta_placement ?? "",
        tela: page?.slug ?? "",
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
