/**
 * Onboarding e crescimento (server-only): e-mail de ativação após a compra e
 * aviso de fim do período de teste.
 */
import { appKeyFromPriceId, getFlexusApp, planTierFromPriceId } from "@/lib/flexus-apps";

const SITE = "https://xfts-flexus.com";

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function emailForUser(userId: string): Promise<string | null> {
  try {
    const supabase = await db();
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

/** E-mail de boas-vindas enviado uma única vez por assinatura. */
export async function sendWelcomeEmail(input: {
  userId: string | null;
  subscriptionId: string;
  priceId: string | null;
  status: string;
  trialEnd?: string | null;
  environment: string;
}): Promise<void> {
  try {
    if (!input.userId) return;
    const email = await emailForUser(input.userId);
    if (!email) return;

    const appKey = appKeyFromPriceId(input.priceId);
    const produto = appKey ? getFlexusApp(appKey)?.name ?? appKey : "FLEXUS";

    const { enqueueEmail } = await import("@/lib/email-queue.server");
    await enqueueEmail({
      template: "boas-vindas",
      recipient: email,
      idempotencyKey: `welcome:${input.subscriptionId}`,
      templateData: {
        produto,
        plano: input.priceId ? planTierFromPriceId(input.priceId) ?? "" : "",
        trial: input.status === "trialing" ? formatDate(input.trialEnd) : "",
        url: `${SITE}/minha-conta`,
      },
      environment: input.environment,
    });
  } catch {
    // onboarding nunca derruba o processamento do pagamento
  }
}

export interface TrialSweepResult {
  emTeste: number;
  avisados: number;
}

/** Avisa quem está a 3 dias (ou menos) do fim do teste. Idempotente por dia. */
export async function runTrialReminders(): Promise<TrialSweepResult> {
  const supabase = await db();
  const limite = new Date(Date.now() + 3 * 86_400_000).toISOString();

  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, user_id, price_id, current_period_end, environment")
    .eq("status", "trialing")
    .lte("current_period_end", limite)
    .gt("current_period_end", new Date().toISOString());

  const rows = (data ?? []) as unknown as Array<{
    stripe_subscription_id: string;
    user_id: string | null;
    price_id: string | null;
    current_period_end: string | null;
    environment: string;
  }>;

  const { enqueueEmail } = await import("@/lib/email-queue.server");
  let avisados = 0;

  for (const row of rows) {
    if (!row.user_id) continue;
    const email = await emailForUser(row.user_id);
    if (!email) continue;

    const fim = row.current_period_end ? new Date(row.current_period_end).getTime() : 0;
    const dias = Math.max(1, Math.ceil((fim - Date.now()) / 86_400_000));
    const appKey = appKeyFromPriceId(row.price_id);

    const result = await enqueueEmail({
      template: "trial-terminando",
      recipient: email,
      idempotencyKey: `trial:${row.stripe_subscription_id}:${row.current_period_end ?? ""}`,
      templateData: {
        produto: appKey ? getFlexusApp(appKey)?.name ?? appKey : "FLEXUS",
        plano: row.price_id ? planTierFromPriceId(row.price_id) ?? "" : "",
        fim: formatDate(row.current_period_end),
        dias,
        url: `${SITE}/minha-conta`,
      },
      environment: row.environment,
    });
    if (!result.duplicate) avisados += 1;
  }

  return { emTeste: rows.length, avisados };
}
