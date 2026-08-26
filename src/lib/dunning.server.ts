import { createClient } from "@supabase/supabase-js";
import type { StripeEnv } from "@/lib/stripe.server";
import {
  appKeyFromPriceId,
  billingIntervalFromPriceId,
  getFlexusApp,
  planTierFromPriceId,
} from "@/lib/flexus-apps";
import { provisionApp } from "@/lib/provisioning.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

/** Régua de cobrança: e-mails em D+1, D+3 e D+5; bloqueio ao fim da carência. */
export const DUNNING_STAGES = [1, 3, 5] as const;
export const GRACE_DAYS = 5;

let _client: ReturnType<typeof createClient> | null = null;
function db() {
  if (!_client) {
    _client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _client;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function planLabel(priceId: string | null | undefined) {
  const app = getFlexusApp(appKeyFromPriceId(priceId) ?? "");
  const tier = planTierFromPriceId(priceId);
  const interval = billingIntervalFromPriceId(priceId);
  return {
    produto: app?.name ?? "FLEXUS",
    plano: `${tier} ${interval}`,
  };
}

function brl(value: number | null | undefined) {
  if (value == null) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateBR(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

async function emailForUser(userId: string | null | undefined) {
  if (!userId) return null;
  const { data } = await db().auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function sendStage(state: any, stage: number) {
  const email = state.email as string | null;
  if (!email) {
    await db().from("dunning_emails").insert({
      stripe_subscription_id: state.stripe_subscription_id,
      user_id: state.user_id,
      stage,
      email: null,
      status: "skipped",
      error: "titular sem e-mail",
      environment: state.environment,
    } as never);
    return;
  }

  const { produto, plano } = planLabel(state.price_id);
  const { enqueueEmail } = await import("@/lib/email-queue.server");

  // A fila garante nova tentativa automática se o envio falhar agora.
  const outcome = await enqueueEmail({
    template: "pagamento-falhou",
    recipient: email,
    idempotencyKey: `dunning-${state.stripe_subscription_id}-${stage}`,
    environment: state.environment,
    templateData: {
      nome: email.split("@")[0],
      produto,
      plano,
      valor: brl(state.amount_due),
      stage,
      acessoAte: dateBR(state.grace_until),
      url: "https://xfts-flexus.com/minha-conta",
    },
  });

  const statusMap: Record<string, string> = {
    sent: "sent",
    suppressed: "suppressed",
    pending: "queued",
    failed: "error",
    discarded: "error",
  };

  await db().from("dunning_emails").insert({
    stripe_subscription_id: state.stripe_subscription_id,
    user_id: state.user_id,
    stage,
    email,
    status: statusMap[outcome.status] ?? "queued",
    error: outcome.error ?? null,
    environment: state.environment,
  } as never);


  await db()
    .from("dunning_state")
    .update({ last_stage: stage } as never)
    .eq("stripe_subscription_id", state.stripe_subscription_id);
}

/** Abre (ou reabre) a régua de cobrança após uma falha de pagamento. */
export async function openDunning(args: {
  subscriptionId: string;
  userId: string | null | undefined;
  priceId: string | null | undefined;
  invoiceId?: string | null;
  amountDue?: number | null;
  env: StripeEnv;
}) {
  const email = await emailForUser(args.userId);
  const now = new Date();
  const graceUntil = new Date(now.getTime() + GRACE_DAYS * DAY_MS);

  const { data: existing } = await db()
    .from("dunning_state")
    .select("stripe_subscription_id, resolved_at")
    .eq("stripe_subscription_id", args.subscriptionId)
    .maybeSingle();

  const row = {
    stripe_subscription_id: args.subscriptionId,
    user_id: args.userId ?? null,
    email,
    price_id: args.priceId ?? null,
    invoice_id: args.invoiceId ?? null,
    amount_due: args.amountDue ?? null,
    environment: args.env,
    updated_at: now.toISOString(),
    ...(!existing || (existing as any).resolved_at
      ? {
          failed_at: now.toISOString(),
          grace_until: graceUntil.toISOString(),
          last_stage: 0,
          resolved_at: null,
          blocked_at: null,
        }
      : {}),
  };

  await db()
    .from("dunning_state")
    .upsert(row as never, { onConflict: "stripe_subscription_id" });

  const { data: state } = await db()
    .from("dunning_state")
    .select("*")
    .eq("stripe_subscription_id", args.subscriptionId)
    .maybeSingle();

  // Primeiro aviso sai na hora da falha (D+1 da régua).
  if (state && (state as any).last_stage === 0) {
    await sendStage(state, 1);
  }
}

/** Fecha a régua quando o pagamento é regularizado. */
export async function resolveDunning(subscriptionId: string) {
  await db()
    .from("dunning_state")
    .update({ resolved_at: new Date().toISOString() } as never)
    .eq("stripe_subscription_id", subscriptionId)
    .is("resolved_at", null);
}

export interface DunningSweepResult {
  checked: number;
  emails: number;
  blocked: number;
}

/** Roda a régua: envia D+3 e D+5 e bloqueia o acesso ao fim da carência. */
export async function runDunningSweep(): Promise<DunningSweepResult> {
  const { data } = await db()
    .from("dunning_state")
    .select("*")
    .is("resolved_at", null)
    .is("blocked_at", null);

  const rows = (data ?? []) as any[];
  let emails = 0;
  let blocked = 0;
  const now = Date.now();

  for (const state of rows) {
    const days = Math.floor((now - new Date(state.failed_at).getTime()) / DAY_MS);

    for (const stage of DUNNING_STAGES) {
      if (days >= stage && state.last_stage < stage) {
        await sendStage(state, stage);
        state.last_stage = stage;
        emails += 1;
      }
    }

    if (new Date(state.grace_until).getTime() <= now) {
      await provisionApp({
        event: "canceled",
        userId: state.user_id,
        priceId: state.price_id,
        status: "unpaid",
        accessUntil: null,
        environment: state.environment as StripeEnv,
      });
      await db()
        .from("dunning_state")
        .update({ blocked_at: new Date().toISOString() } as never)
        .eq("stripe_subscription_id", state.stripe_subscription_id);
      await db().from("subscription_events").insert({
        user_id: state.user_id,
        stripe_subscription_id: state.stripe_subscription_id,
        event_type: "acesso_bloqueado_inadimplencia",
        price_id: state.price_id,
        reason: `carência de ${GRACE_DAYS} dias encerrada`,
        environment: state.environment,
      } as never);
      blocked += 1;
    }
  }

  return { checked: rows.length, emails, blocked };
}
