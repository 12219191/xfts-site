import { createClient } from "@supabase/supabase-js";
import type { StripeEnv } from "@/lib/stripe.server";
import { provisionApp, type ProvisionEvent } from "@/lib/provisioning.server";

/** Avisa o sistema do produto (outro domínio) e registra falhas para retry. */
async function provision(
  event: ProvisionEvent,
  args: {
    userId: string | null | undefined;
    priceId: string | null | undefined;
    status?: string | null;
    accessUntil?: string | null;
    env: StripeEnv;
  },
) {
  const result = await provisionApp({
    event,
    userId: args.userId,
    priceId: args.priceId,
    status: args.status ?? null,
    accessUntil: args.accessUntil ?? null,
    environment: args.env,
  });
  if (!result.ok && result.app) {
    console.error("Falha ao provisionar", result.app, result.error);
    await logEvent({
      user_id: args.userId ?? null,
      event_type: "provisionamento_falhou",
      price_id: args.priceId ?? null,
      reason: `${result.app}: ${result.error}`,
      environment: args.env,
    });
  }
}

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

/** Notifica o time comercial via Zapier. Nunca derruba o webhook. */
async function notifyTeam(payload: Record<string, unknown>) {
  const url = process.env["ZAPIER_SUBSCRIPTION_WEBHOOK_URL"];
  if (!url) {
    console.log("Zapier não configurado, pulando notificação:", payload["event"]);
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    });
  } catch (e) {
    console.error("Falha ao notificar Zapier:", e);
  }
}

async function logEvent(row: Record<string, unknown>) {
  const { error } = await getSupabase().from("subscription_events").insert(row as never);
  if (error) console.error("Falha ao registrar evento:", error.message);
}

function resolvePriceId(item: any): string {
  return (
    item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id
  );
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  if (session.payment_status === "unpaid") return;
  await notifyTeam({
    event: "compra_concluida",
    environment: env,
    user_id: session.metadata?.userId ?? null,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    nome: session.customer_details?.name ?? null,
    valor: session.amount_total ? session.amount_total / 100 : null,
    moeda: session.currency,
    modo: session.mode,
    checkout_session_id: session.id,
  });
}

/** Identidade do evento do Stripe, usada para idempotência e ordenação. */
export type EventMeta = { id: string | null; created: number | null };

export function metaOf(event: any): EventMeta {
  return {
    id: event?.id ?? null,
    created: typeof event?.created === "number" ? event.created : null,
  };
}

function eventStamp(meta: EventMeta) {
  return {
    last_event_id: meta.id,
    last_event_created: meta.created ? new Date(meta.created * 1000).toISOString() : null,
  };
}

/**
 * Evita reprocessar o mesmo evento e aplicar eventos que chegaram fora de ordem
 * (o Stripe pode reenviar e entregar eventos antigos depois dos novos).
 */
async function isStaleEvent(subscriptionId: string, meta: EventMeta) {
  if (!subscriptionId) return false;
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("last_event_id, last_event_created")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  const row = data as any;
  if (!row) return false;
  if (meta.id && row.last_event_id && row.last_event_id === meta.id) return true;
  if (!meta.created || !row.last_event_created) return false;
  return new Date(row.last_event_created).getTime() > meta.created * 1000;
}

async function handleSubscriptionCreated(
  subscription: any,
  env: StripeEnv,
  meta: EventMeta,
) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  if (await isStaleEvent(subscription.id, meta)) {
    console.log("Evento ignorado (fora de ordem/duplicado):", meta.id, subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: item?.price?.product,
        price_id: priceId,
        status: subscription.status,
        current_period_start: periodStart
          ? new Date(periodStart * 1000).toISOString()
          : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        environment: env,
        ...eventStamp(meta),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "stripe_subscription_id" },
    );

  await logEvent({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    event_type: "assinatura_criada",
    price_id: priceId,
    environment: env,
  });
  await notifyTeam({
    event: "assinatura_criada",
    environment: env,
    user_id: userId,
    plano: priceId,
    status: subscription.status,
    stripe_subscription_id: subscription.id,
  });
  await provision("created", {
    userId,
    priceId,
    status: subscription.status,
    accessUntil: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    env,
  });
}

async function handleSubscriptionUpdated(
  subscription: any,
  env: StripeEnv,
  meta: EventMeta,
) {
  if (await isStaleEvent(subscription.id, meta)) {
    console.log("Evento ignorado (fora de ordem/duplicado):", meta.id, subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { data: existing } = await getSupabase()
    .from("subscriptions")
    .select("user_id, price_id, status, cancel_at_period_end")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: item?.price?.product,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      ...eventStamp(meta),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (!existing) return;
  const prev = existing as any;

  if (prev.price_id && priceId && prev.price_id !== priceId) {
    await logEvent({
      user_id: prev.user_id,
      stripe_subscription_id: subscription.id,
      event_type: "plano_alterado",
      price_id: priceId,
      environment: env,
    });
    await notifyTeam({
      event: "plano_alterado",
      environment: env,
      user_id: prev.user_id,
      plano_anterior: prev.price_id,
      plano_novo: priceId,
    });
  }

  if (subscription.cancel_at_period_end && !prev.cancel_at_period_end) {
    await logEvent({
      user_id: prev.user_id,
      stripe_subscription_id: subscription.id,
      event_type: "cancelamento_agendado",
      price_id: priceId,
      reason: subscription.cancellation_details?.comment ?? null,
      environment: env,
    });
    await notifyTeam({
      event: "cancelamento_agendado",
      environment: env,
      user_id: prev.user_id,
      plano: priceId,
      motivo: subscription.cancellation_details?.comment ?? null,
      acesso_ate: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });
  }

  if (!subscription.cancel_at_period_end && prev.cancel_at_period_end) {
    await logEvent({
      user_id: prev.user_id,
      stripe_subscription_id: subscription.id,
      event_type: "assinatura_reativada",
      price_id: priceId,
      environment: env,
    });
    await notifyTeam({
      event: "assinatura_reativada",
      environment: env,
      user_id: prev.user_id,
      plano: priceId,
    });
  }

  await provision("updated", {
    userId: prev.user_id,
    priceId,
    status: subscription.status,
    accessUntil: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    env,
  });
}

async function handleSubscriptionDeleted(
  subscription: any,
  env: StripeEnv,
  meta: EventMeta,
) {
  if (await isStaleEvent(subscription.id, meta)) {
    console.log("Evento ignorado (fora de ordem/duplicado):", meta.id, subscription.id);
    return;
  }
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  const existing = data as any;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      ...eventStamp(meta),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  await logEvent({
    user_id: existing?.user_id ?? null,
    stripe_subscription_id: subscription.id,
    event_type: "assinatura_encerrada",
    price_id: existing?.price_id ?? null,
    environment: env,
  });
  await notifyTeam({
    event: "assinatura_encerrada",
    environment: env,
    user_id: existing?.user_id ?? null,
    plano: existing?.price_id ?? null,
  });
  await provision("canceled", {
    userId: existing?.user_id,
    priceId: existing?.price_id,
    status: "canceled",
    env,
  });
}

async function handlePaymentFailed(invoice: any, env: StripeEnv) {
  const subscriptionId =
    invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  const existing = data as any;

  await logEvent({
    user_id: existing?.user_id ?? null,
    stripe_subscription_id: subscriptionId,
    event_type: "pagamento_falhou",
    price_id: existing?.price_id ?? null,
    environment: env,
  });
  await notifyTeam({
    event: "pagamento_falhou",
    environment: env,
    user_id: existing?.user_id ?? null,
    plano: existing?.price_id ?? null,
    carencia_dias: 5,
    valor: invoice.amount_due ? invoice.amount_due / 100 : null,
  });
  await provision("payment_failed", {
    userId: existing?.user_id,
    priceId: existing?.price_id,
    status: "past_due",
    env,
  });

  // Abre a régua de cobrança (e-mail D+1 imediato, D+3 e D+5 pelo sweep).
  const { openDunning } = await import("@/lib/dunning.server");
  await openDunning({
    subscriptionId: subscriptionId,
    userId: existing?.user_id,
    priceId: existing?.price_id,
    invoiceId: invoice.id ?? null,
    amountDue: invoice.amount_due ? invoice.amount_due / 100 : null,
    env,
  });
}

/** Pagamento regularizado: encerra a régua de cobrança. */
async function handleInvoicePaid(invoice: any) {
  const subscriptionId =
    invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  const { resolveDunning } = await import("@/lib/dunning.server");
  await resolveDunning(subscriptionId);
}

/** Registra o recebimento do evento para monitoramento no /admin. */
export async function logWebhookEvent(row: {
  stripe_event_id: string | null;
  event_type: string;
  environment: string;
  status: "processed" | "ignored" | "failed";
  error?: string | null;
  duration_ms: number;
  summary?: Record<string, unknown>;
}) {
  try {
    const { error } = await getSupabase()
      .from("webhook_events")
      .upsert({ ...row, summary: row.summary ?? {} } as never, {
        onConflict: "stripe_event_id",
      });
    if (error) console.error("Falha ao registrar webhook_event:", error.message);
  } catch (e) {
    console.error("Falha ao registrar webhook_event:", e);
  }
}

export const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
  "invoice.payment_succeeded",
]);

export function eventSummary(event: any): Record<string, unknown> {
  const o = event?.data?.object ?? {};
  return {
    object_id: o.id ?? null,
    user_id: o.metadata?.userId ?? null,
    subscription:
      o.subscription ?? o.parent?.subscription_details?.subscription ?? null,
    customer: o.customer ?? null,
    status: o.status ?? o.payment_status ?? null,
    amount:
      typeof o.amount_total === "number"
        ? o.amount_total / 100
        : typeof o.amount_due === "number"
          ? o.amount_due / 100
          : null,
    currency: o.currency ?? null,
  };
}

/** Roteia um evento do Stripe para o handler correspondente. */
export async function handleStripeEvent(event: any, env: StripeEnv) {
  const meta = metaOf(event);
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env, meta);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env, meta);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env, meta);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event.data.object);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

/**
 * Reserva o evento antes de processar. Garante que cada stripe_event_id seja
 * processado uma única vez, mesmo com reentregas simultâneas do Stripe.
 */
export async function claimWebhookEvent(args: {
  eventId: string | null;
  eventType: string;
  environment: string;
}): Promise<{ proceed: boolean; reason?: "duplicate" | "in_flight" | "no_id"; attempts: number }> {
  if (!args.eventId) return { proceed: true, reason: "no_id", attempts: 1 };
  const now = new Date().toISOString();
  const { error } = await getSupabase().from("webhook_events").insert({
    stripe_event_id: args.eventId,
    event_type: args.eventType,
    environment: args.environment,
    status: "processing",
    claimed_at: now,
    attempts: 1,
  } as never);

  if (!error) return { proceed: true, attempts: 1 };
  if (error.code !== "23505") {
    // Falha inesperada ao reservar: processa mesmo assim para não perder o evento.
    console.error("Falha ao reservar webhook_event:", error.message);
    return { proceed: true, attempts: 1 };
  }

  const { data } = await getSupabase()
    .from("webhook_events")
    .select("status, attempts, claimed_at")
    .eq("stripe_event_id", args.eventId)
    .maybeSingle();
  const row = data as any;
  if (!row) return { proceed: true, attempts: 1 };

  if (row.status === "processed" || row.status === "ignored") {
    return { proceed: false, reason: "duplicate", attempts: row.attempts ?? 1 };
  }
  if (row.status === "processing") {
    const claimedAt = row.claimed_at ? new Date(row.claimed_at).getTime() : 0;
    if (Date.now() - claimedAt < 5 * 60 * 1000) {
      return { proceed: false, reason: "in_flight", attempts: row.attempts ?? 1 };
    }
  }

  const attempts = (row.attempts ?? 1) + 1;
  await getSupabase()
    .from("webhook_events")
    .update({ status: "processing", claimed_at: now, attempts, error: null } as never)
    .eq("stripe_event_id", args.eventId);
  return { proceed: true, attempts };
}

/** Fecha o registro do evento com o resultado do processamento. */
export async function finalizeWebhookEvent(row: {
  stripe_event_id: string | null;
  event_type: string;
  environment: string;
  status: "processed" | "ignored" | "failed";
  error?: string | null;
  duration_ms: number;
  summary?: Record<string, unknown>;
  attempts?: number;
}) {
  const payload = {
    stripe_event_id: row.stripe_event_id,
    event_type: row.event_type,
    environment: row.environment,
    status: row.status,
    error: row.error ?? null,
    duration_ms: row.duration_ms,
    summary: row.summary ?? {},
    processed_at: new Date().toISOString(),
    ...(row.attempts ? { attempts: row.attempts } : {}),
  };
  try {
    if (row.stripe_event_id) {
      const { error } = await getSupabase()
        .from("webhook_events")
        .update(payload as never)
        .eq("stripe_event_id", row.stripe_event_id);
      if (error) console.error("Falha ao finalizar webhook_event:", error.message);
      return;
    }
    await logWebhookEvent(row as any);
  } catch (e) {
    console.error("Falha ao finalizar webhook_event:", e);
  }
}
