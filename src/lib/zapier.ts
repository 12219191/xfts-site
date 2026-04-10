const ZAPIER_WEBHOOK_URL_KEY = "xfts_zapier_webhook_url";

export function getZapierWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ZAPIER_WEBHOOK_URL_KEY) || "";
}

export function setZapierWebhookUrl(url: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ZAPIER_WEBHOOK_URL_KEY, url);
}

export async function sendToZapier(
  data: Record<string, string>,
  formType: "contato" | "demo"
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = getZapierWebhookUrl();

  if (!webhookUrl) {
    return {
      success: false,
      message: "URL do webhook Zapier não configurada. Acesse as configurações para adicionar.",
    };
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
      body: JSON.stringify({
        ...data,
        form_type: formType,
        timestamp: new Date().toISOString(),
        source: window.location.origin,
      }),
    });

    return {
      success: true,
      message: "Mensagem enviada com sucesso! Entraremos em contato em breve.",
    };
  } catch {
    return {
      success: false,
      message: "Erro ao enviar mensagem. Tente novamente.",
    };
  }
}
