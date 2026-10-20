/**
 * Provisionamento: o hub avisa o sistema do produto (outro domínio) para
 * criar, liberar ou bloquear a conta do cliente.
 */
import {
  appKeyFromPriceId,
  getFlexusApp,
  planTierFromPriceId,
  seatsFromPriceId,
} from "@/lib/flexus-apps";
import { appApiKey, signBody } from "@/lib/sso.server";

export type ProvisionEvent = "created" | "updated" | "canceled" | "payment_failed";

interface ProvisionInput {
  priceId: string | null | undefined;
  userId: string | null | undefined;
  event: ProvisionEvent;
  status?: string | null;
  accessUntil?: string | null;
  environment: string;
  /** True quando a chamada vem da fila de reenvio (não reenfileira). */
  fromQueue?: boolean;
}

/** Registra o resultado e, quando falha, agenda nova tentativa automática. */
async function finish(
  input: ProvisionInput,
  appKey: string | null,
  outcome: { ok: boolean; error?: string },
  startedAt: number,
  httpStatus: number | null = null,
): Promise<{ ok: boolean; app: string | null; error?: string }> {
  const { logIntegrationEvent } = await import("@/lib/integration-log.server");
  await logIntegrationEvent({
    appKey: appKey ?? "",
    kind: "provision",
    status: outcome.ok ? "ok" : "error",
    httpStatus,
    reason: outcome.error ?? null,
    userId: input.userId ?? null,
    durationMs: Date.now() - startedAt,
    environment: input.environment,
    detail: { event: input.event, price_id: input.priceId ?? null },
  });

  if (appKey && !input.fromQueue) {
    const reliability = await import("@/lib/reliability.server");
    const payload = {
      priceId: input.priceId ?? null,
      userId: input.userId ?? null,
      event: input.event,
      status: input.status ?? null,
      accessUntil: input.accessUntil ?? null,
      environment: input.environment,
    };
    if (outcome.ok) await reliability.resolveProvisionQueue(appKey, payload.userId);
    else await reliability.enqueueProvision(appKey, payload, outcome.error ?? "falha");
  }

  return { ok: outcome.ok, app: appKey, error: outcome.error };
}

/** Nunca lança: falhas são registradas e não derrubam o webhook do pagamento. */
export async function provisionApp(
  input: ProvisionInput,
): Promise<{ ok: boolean; app: string | null; error?: string }> {
  const startedAt = Date.now();
  const appKey = appKeyFromPriceId(input.priceId);
  if (!appKey || !input.userId) return { ok: false, app: appKey, error: "sem app/usuário" };

  const app = getFlexusApp(appKey);
  const { productFlagsOf } = await import("@/lib/catalog.server");
  const { canAccess } = await import("@/lib/catalog");
  if (!app || !canAccess(await productFlagsOf(app.key)) || !app.url) {
    return finish(input, appKey, { ok: false, error: "app indisponível" }, startedAt);
  }

  const secret = appApiKey(appKey);
  if (!secret) {
    return finish(input, appKey, { ok: false, error: "chave do app não configurada" }, startedAt);
  }

  const { resolveEntitlements } = await import("@/lib/entitlements.server");
  const ent = await resolveEntitlements({
    priceId: input.priceId,
    status: input.event === "canceled" ? "canceled_now" : (input.status ?? "active"),
    currentPeriodEnd: input.accessUntil ?? null,
  });

  // Flow: campos aditivos de período/teste (outros sistemas não recebem).
  let flowExtra: Record<string, string | null> = {};
  if (appKey === "flow") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("subscriptions")
      .select("status, current_period_start, current_period_end, environment, price_id")
      .eq("user_id", input.userId)
      .eq("price_id", input.priceId ?? "")
      .eq("environment", input.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { flowPeriodFields } = await import("@/lib/flow-sub");
    flowExtra = flowPeriodFields(row ?? null);
  }

  let body: string;
  if (appKey === "atende") {
    const { buildAtendeProvisionBody } = await import("@/lib/atende-provision");
    const { loadAtendeCreditCycle } = await import("@/lib/entitlements.server");
    const creditCycle =
      input.event === "canceled" || input.environment !== "live"
        ? undefined
        : await loadAtendeCreditCycle(input.userId);
    const built = buildAtendeProvisionBody({
      event: input.event,
      userId: input.userId,
      priceId: input.priceId ?? "",
      status: input.status ?? null,
      accessUntil: input.accessUntil ?? null,
      environment: input.environment,
      planoNome: ent.planoNome,
      features: ent.features,
      limites: ent.limites,
      timestamp: new Date().toISOString(),
      creditCycle,
    });
    if (!built.ok) return finish(input, appKey, { ok: false, error: built.error }, startedAt);
    body = JSON.stringify(built.body);
  } else body = JSON.stringify({
    event: input.event,
    user_id: input.userId,
    produto: appKey,
    plano: planTierFromPriceId(input.priceId),
    limite_usuarios:
      input.event === "canceled" ? 0 : seatsFromPriceId(input.priceId),
    recursos: input.event === "canceled" ? {} : ent.features,
    limites: input.event === "canceled" ? {} : ent.limites,
    price_id: input.priceId,
    status: input.status ?? null,
    acesso_ate: input.accessUntil ?? null,
    environment: input.environment,
    timestamp: new Date().toISOString(),
    ...flowExtra,
  });

  try {
    const signature = await signBody(secret, body);
    const endpoint = app.provisionUrl ?? `${app.url}/api/provision`;
    const res = await fetch(endpoint, {

      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flexus-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return finish(input, appKey, { ok: false, error: `HTTP ${res.status}` }, startedAt, res.status);
    }
    // Um SPA devolve o HTML da página para qualquer rota: isso não é sucesso.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return finish(
        input,
        appKey,
        { ok: false, error: "endpoint /api/provision não implementado no sistema" },
        startedAt,
        res.status,
      );
    }
    return finish(input, appKey, { ok: true }, startedAt, res.status);
  } catch (e) {
    return finish(
      input,
      appKey,
      { ok: false, error: e instanceof Error ? e.message : "falha de rede" },
      startedAt,
    );
  }
}
