import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ZAPIER_URL = Deno.env.get("ZAPIER_SUBSCRIPTION_WEBHOOK_URL") || "";

/** Notifica o time comercial via Zapier. Nunca derruba o webhook. */
async function notifyTeam(payload: Record<string, unknown>) {
  if (!ZAPIER_URL) {
    console.log("Zapier webhook não configurado, pulando notificação:", payload.event);
    return;
  }
  try {
    await fetch(ZAPIER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
    });
  } catch (e) {
    console.error("Falha ao notificar Zapier:", e);
  }
}

async function logEvent(row: {
  user_id?: string | null;
  stripe_subscription_id?: string | null;
  event_type: string;
  price_id?: string | null;
  reason?: string | null;
  environment: StripeEnv;
}) {
  const { error } = await supabase.from("subscription_events").insert(row);
  if (error) console.error("Falha ao registrar evento:", error.message);
}

function resolvePriceId(item: any): string {
  return (
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id
  );
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
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

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  console.log("Checkout completed:", session.id, "mode:", session.mode);
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
  const productId = item?.price?.product;

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
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
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item);
  const productId = item?.price?.product;

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id, price_id, status, cancel_at_period_end")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (!existing) return;

  // Troca de plano
  if (existing.price_id && priceId && existing.price_id !== priceId) {
    await logEvent({
      user_id: existing.user_id,
      stripe_subscription_id: subscription.id,
      event_type: "plano_alterado",
      price_id: priceId,
      environment: env,
    });
    await notifyTeam({
      event: "plano_alterado",
      environment: env,
      user_id: existing.user_id,
      plano_anterior: existing.price_id,
      plano_novo: priceId,
    });
  }

  // Cancelamento agendado para o fim do período
  if (subscription.cancel_at_period_end && !existing.cancel_at_period_end) {
    await logEvent({
      user_id: existing.user_id,
      stripe_subscription_id: subscription.id,
      event_type: "cancelamento_agendado",
      price_id: priceId,
      reason: subscription.cancellation_details?.comment ?? null,
      environment: env,
    });
    await notifyTeam({
      event: "cancelamento_agendado",
      environment: env,
      user_id: existing.user_id,
      plano: priceId,
      motivo: subscription.cancellation_details?.comment ?? null,
      acesso_ate: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });
  }

  // Reativação
  if (!subscription.cancel_at_period_end && existing.cancel_at_period_end) {
    await logEvent({
      user_id: existing.user_id,
      stripe_subscription_id: subscription.id,
      event_type: "assinatura_reativada",
      price_id: priceId,
      environment: env,
    });
    await notifyTeam({
      event: "assinatura_reativada",
      environment: env,
      user_id: existing.user_id,
      plano: priceId,
    });
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
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
}

async function handlePaymentFailed(invoice: any, env: StripeEnv) {
  const subscriptionId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  console.log("Payment failed:", invoice.id, "subscription:", subscriptionId);
  if (!subscriptionId) return;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

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
    // Acesso mantido por 3 dias de carência a partir do fim do período pago.
    carencia_dias: 3,
    valor: invoice.amount_due ? invoice.amount_due / 100 : null,
  });
}
