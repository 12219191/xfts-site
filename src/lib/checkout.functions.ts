import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import { friendlyStripeError } from "@/lib/subscriptions.server";
import {
  ACTIVE_STATUSES,
  appKeyFromPriceId,
  getFlexusApp,
  planTierFromPriceId,
} from "@/lib/flexus-apps";
import { isRealStripeId } from "@/lib/subscription-guards";

export interface CheckoutSessionResult {
  clientSecret: string;
}

export interface CheckoutStatusResult {
  status: string | null;
  paymentStatus: string | null;
  subscriptionId: string | null;
  priceId: string | null;
  /** true quando o webhook já gravou a assinatura no hub. */
  provisioned: boolean;
}

/**
 * Cria a sessão de checkout embutido.
 *
 * Regras aplicadas no servidor:
 * - o usuário precisa estar autenticado (userId vem do JWT, nunca do body);
 * - reaproveita o cadastro de cobrança existente, para não fragmentar faturas;
 * - bloqueia compra duplicada do mesmo sistema FLEXUS.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      priceId: string;
      environment: StripeEnv;
      quantity?: number;
      returnUrl?: string;
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId ?? "")) throw new Error("Plano inválido");
      return data;
    },
  )
  .handler(
    async ({ data, context }): Promise<CheckoutSessionResult | { error: string }> => {
      const { supabase, userId, claims } = context;
      const email = (claims as { email?: string } | null)?.email;
      const appKey = appKeyFromPriceId(data.priceId);

      /** Deixa o motivo real da recusa visível nos logs do servidor. */
      const refuse = (reason: string): { error: string } => {
        console.error("[checkout] recusado", {
          userId,
          priceId: data.priceId,
          appKey,
          environment: data.environment,
          reason,
        });
        return { error: reason };
      };


      if (appKey) {
        const { productFlagsOf } = await import("@/lib/catalog.server");
        const { canPurchase, statusLabel } = await import("@/lib/catalog");
        const flags = await productFlagsOf(appKey);
        if (!canPurchase(flags)) {
          const appName = getFlexusApp(appKey)?.name ?? "Este sistema";
          return refuse(
            `${appName} não está disponível para contratação no momento (${statusLabel(
              flags.status,
            ).toLowerCase()}).`,
          );
        }
      }


      const { data: rows } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id, price_id, status, current_period_end")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false });

      const subs = rows ?? [];

      // Compra duplicada do mesmo sistema.
      const duplicate = subs.find((s) => {
        if (appKeyFromPriceId(s.price_id) !== appKey) return false;
        const periodOk =
          !s.current_period_end || new Date(s.current_period_end).getTime() > Date.now();
        return periodOk && ACTIVE_STATUSES.includes(s.status);
      });
      if (duplicate) {
        const appName = appKey ? getFlexusApp(appKey)?.name : null;
        return refuse(
          `Você já tem uma assinatura ativa${appName ? ` do ${appName}` : ""} (plano ${planTierFromPriceId(
            duplicate.price_id,
          )}). Use "Minha conta" para trocar de plano em vez de comprar novamente.`,
        );
      }


      const existingCustomer = subs.find((s) =>
        isRealStripeId(s.stripe_customer_id, "cus_"),
      )?.stripe_customer_id;

      try {
        const stripe = createStripeClient(data.environment);

        const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
        const stripePrice = prices?.data?.[0];
        if (!stripePrice) return refuse("Plano não encontrado no provedor de pagamento.");

        const isRecurring = stripePrice.type === "recurring";

        // Reaproveita (ou cria uma única vez) o cadastro de cobrança do usuário.
        let customerId = existingCustomer ?? undefined;
        if (!customerId && email) {
          const found = await stripe.customers.list({ email, limit: 1 });
          customerId = found.data[0]?.id;
          if (!customerId) {
            const created = await stripe.customers.create({
              email,
              metadata: { userId },
            });
            customerId = created.id;
          }
        }

        // Teste grátis: só na primeira contratação do sistema, se o plano oferecer.
        let trialDays = 0;
        if (isRecurring) {
          const jaTeveEsteSistema = subs.some(
            (s) => appKeyFromPriceId(s.price_id) === appKey,
          );
          if (!jaTeveEsteSistema) {
            const { data: planRow } = await supabase
              .from("catalog_plans")
              .select("trial_days")
              .or(
                `price_lookup_key.eq.${data.priceId},annual_lookup_key.eq.${data.priceId}`,
              )
              .limit(1)
              .maybeSingle();
            trialDays = Math.max(
              0,
              Math.min(90, Number((planRow as { trial_days?: number } | null)?.trial_days ?? 0)),
            );
          }
        }

        const session = await stripe.checkout.sessions.create({
          line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
          mode: isRecurring ? "subscription" : "payment",
          ui_mode: "embedded_page",
          // Permite cupons de beta tester / desconto promocional no checkout.
          allow_promotion_codes: true,
          ...(data.returnUrl && { return_url: data.returnUrl }),
          ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
          metadata: { userId, appKey: appKey ?? "", lookupKey: data.priceId },
          ...(isRecurring && {
            subscription_data: {
              metadata: { userId, appKey: appKey ?? "", lookupKey: data.priceId },
              ...(trialDays > 0 && { trial_period_days: trialDays }),
            },
          }),
        });

        if (!session.client_secret) return { error: "Não foi possível iniciar o checkout." };
        return { clientSecret: session.client_secret };
      } catch (error) {
        return { error: friendlyStripeError(error) };
      }
    },
  );

/**
 * Confirma o resultado do checkout na volta do pagamento, sem depender da
 * corrida com o webhook: consulta a sessão no provedor e verifica se a
 * assinatura já foi gravada no hub.
 */
export const getCheckoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_]+$/.test(data.sessionId ?? "")) throw new Error("Sessão inválida");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutStatusResult | { error: string }> => {
    const { supabase, userId } = context;
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);

      if (session.metadata?.userId && session.metadata.userId !== userId) {
        return { error: "Esta sessão de pagamento não pertence à sua conta." };
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

      let provisioned = false;
      if (subscriptionId) {
        const { data: row } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        provisioned = Boolean(row);
      }

      return {
        status: session.status ?? null,
        paymentStatus: session.payment_status ?? null,
        subscriptionId,
        priceId: session.metadata?.lookupKey ?? null,
        provisioned,
      };
    } catch (error) {
      return { error: friendlyStripeError(error) };
    }
  });
