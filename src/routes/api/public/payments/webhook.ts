import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
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

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
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

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
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

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  const existing = data as any;

  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() } as never)
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


export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook com env inválido:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          console.log("Received event:", event.type, "env:", env);
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object, env);
              break;
            case "customer.subscription.created":
              await handleSubscriptionCreated(event.data.object, env);
              break;
            case "customer.subscription.updated":
              await handleSubscriptionUpdated(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object, env);
              break;
            case "invoice.payment_failed":
              await handlePaymentFailed(event.data.object, env);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
