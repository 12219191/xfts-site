/**
 * Provisionamento: o hub avisa o sistema do produto (outro domínio) para
 * criar, liberar ou bloquear a conta do cliente.
 */
import { appKeyFromPriceId, getFlexusApp, planTierFromPriceId } from "@/lib/flexus-apps";
import { appApiKey, signBody } from "@/lib/sso.server";

export type ProvisionEvent = "created" | "updated" | "canceled" | "payment_failed";

interface ProvisionInput {
  priceId: string | null | undefined;
  userId: string | null | undefined;
  event: ProvisionEvent;
  status?: string | null;
  accessUntil?: string | null;
  environment: string;
}

/** Nunca lança: falhas são registradas e não derrubam o webhook do pagamento. */
export async function provisionApp(
  input: ProvisionInput,
): Promise<{ ok: boolean; app: string | null; error?: string }> {
  const appKey = appKeyFromPriceId(input.priceId);
  if (!appKey || !input.userId) return { ok: false, app: appKey, error: "sem app/usuário" };

  const app = getFlexusApp(appKey);
  if (!app?.available || !app.url) return { ok: false, app: appKey, error: "app indisponível" };

  const secret = appApiKey(appKey);
  if (!secret) return { ok: false, app: appKey, error: "chave do app não configurada" };

  const body = JSON.stringify({
    event: input.event,
    user_id: input.userId,
    produto: appKey,
    plano: planTierFromPriceId(input.priceId),
    price_id: input.priceId,
    status: input.status ?? null,
    acesso_ate: input.accessUntil ?? null,
    environment: input.environment,
    timestamp: new Date().toISOString(),
  });

  try {
    const signature = await signBody(secret, body);
    const res = await fetch(`${app.url}/api/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flexus-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, app: appKey, error: `HTTP ${res.status}` };
    }
    // Um SPA devolve o HTML da página para qualquer rota: isso não é sucesso.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { ok: false, app: appKey, error: "endpoint /api/provision não implementado no sistema" };
    }
    return { ok: true, app: appKey };
  } catch (e) {
    return { ok: false, app: appKey, error: e instanceof Error ? e.message : "falha de rede" };
  }
}
