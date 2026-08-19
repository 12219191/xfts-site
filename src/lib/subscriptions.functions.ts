import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import { friendlyStripeError } from "@/lib/subscriptions.server";
import { DEMO_MESSAGE, isRealStripeId } from "@/lib/subscription-guards";

type ActionResult = { ok: true; message: string } | { error: string };

const envInput = (data: { environment: StripeEnv }) => data;

/**
 * Cancelamento: o acesso permanece liberado até o fim do período já pago
 * (cancel_at_period_end = true).
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; reason?: string }) => data)
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) return { error: "Nenhuma assinatura encontrada" };
    if (!isRealStripeId(sub.stripe_subscription_id, "sub_")) return { error: DEMO_MESSAGE };

    try {
      const stripe = createStripeClient(data.environment);
      const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
        ...(data.reason && {
          cancellation_details: { comment: data.reason.slice(0, 400) },
        }),
      });
      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", updated.id);
      return {
        ok: true,
        message: "Cancelamento agendado. Você mantém o acesso até o fim do período pago.",
      };
    } catch (error) {
      return { error: friendlyStripeError(error) };
    }
  });

/** Reativa uma assinatura que estava marcada para cancelar no fim do período. */
export const reactivateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(envInput)
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) return { error: "Nenhuma assinatura encontrada" };
    if (!isRealStripeId(sub.stripe_subscription_id, "sub_")) return { error: DEMO_MESSAGE };

    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.stripe_subscription_id);
      return { ok: true, message: "Assinatura reativada com sucesso." };
    } catch (error) {
      return { error: friendlyStripeError(error) };
    }
  });

/**
 * Troca de plano:
 * - Upgrade  -> imediato, com cobrança pró-rata da diferença.
 * - Downgrade -> agendado para o próximo ciclo (sem crédito/estorno).
 */
export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; targetPriceId: string }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.targetPriceId)) throw new Error("Plano inválido");
    return data;
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<
      { ok: true; message: string; applied: "immediate" | "scheduled" } | { error: string }
    > => {
      const { supabase, userId } = context;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub?.stripe_subscription_id) return { error: "Nenhuma assinatura encontrada" };
      if (!isRealStripeId(sub.stripe_subscription_id, "sub_")) return { error: DEMO_MESSAGE };

      try {
        const stripe = createStripeClient(data.environment);

        const prices = await stripe.prices.list({ lookup_keys: [data.targetPriceId] });
        const targetPrice = prices.data[0];
        if (!targetPrice) return { error: "Plano não encontrado" };

        const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const item = subscription.items.data[0];
        if (!item) return { error: "Assinatura sem itens" };

        if (item.price.id === targetPrice.id) {
          return { error: "Você já está neste plano" };
        }

        const currentAmount = item.price.unit_amount ?? 0;
        const targetAmount = targetPrice.unit_amount ?? 0;
        const isUpgrade = targetAmount > currentAmount;

        if (isUpgrade) {
          await stripe.subscriptions.update(subscription.id, {
            items: [{ id: item.id, price: targetPrice.id }],
            proration_behavior: "always_invoice",
            payment_behavior: "error_if_incomplete",
          });
          return {
            ok: true,
            applied: "immediate",
            message: "Upgrade aplicado agora. A diferença foi cobrada de forma proporcional.",
          };
        }

        // Downgrade: agenda a troca para o próximo ciclo.
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: subscription.id,
        });
        const currentPhase = schedule.phases[0];
        await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: "release",
          phases: [
            {
              items: currentPhase.items.map((phaseItem) => ({
                price: typeof phaseItem.price === "string" ? phaseItem.price : phaseItem.price.id,
                quantity: phaseItem.quantity ?? 1,
              })),
              start_date: currentPhase.start_date,
              end_date: currentPhase.end_date,
            },
            {
              items: [{ price: targetPrice.id, quantity: 1 }],
              proration_behavior: "none",
            },
          ],
        });

        return {
          ok: true,
          applied: "scheduled",
          message:
            "Downgrade agendado. Ele entra em vigor na próxima renovação, sem perda do período já pago.",
        };
      } catch (error) {
        return { error: friendlyStripeError(error) };
      }
    },
  );

/**
 * Portal de cobrança do Stripe: o cliente gerencia forma de pagamento,
 * faturas e dados de cobrança direto no ambiente hospedado do provedor.
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; returnUrl?: string }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) return { error: "Nenhuma assinatura encontrada" };
    if (!isRealStripeId(sub.stripe_customer_id, "cus_")) return { error: DEMO_MESSAGE };

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: friendlyStripeError(error) };
    }
  });

export interface InvoiceRow {
  id: string;
  number: string | null;
  status: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: string | null;
  hosted_invoice_url: string | null;
  pdf_url: string | null;
}

/** Lista as faturas recentes do cliente logado. */
export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(envInput)
  .handler(
    async ({ data, context }): Promise<{ invoices: InvoiceRow[] } | { error: string }> => {
      const { supabase, userId } = context;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub?.stripe_customer_id) return { invoices: [] };
      if (!isRealStripeId(sub.stripe_customer_id, "cus_")) return { error: DEMO_MESSAGE };

      try {
        const stripe = createStripeClient(data.environment);
        const list = await stripe.invoices.list({
          customer: sub.stripe_customer_id,
          limit: 12,
        });
        return {
          invoices: list.data.map((inv) => ({
            id: inv.id ?? "",
            number: inv.number ?? null,
            status: inv.status ?? null,
            amount_paid: toMajorUnit(inv.amount_paid, inv.currency),
            amount_due: toMajorUnit(inv.amount_due, inv.currency),
            currency: (inv.currency ?? "brl").toUpperCase(),
            created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            hosted_invoice_url: inv.hosted_invoice_url ?? null,
            pdf_url: inv.invoice_pdf ?? null,
          })),
        };
      } catch (error) {
        return { error: friendlyStripeError(error) };
      }
    },
  );
