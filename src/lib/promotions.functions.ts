import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StripeEnv } from "@/lib/stripe.server";

export interface PromotionRow {
  id: string;
  code: string;
  active: boolean;
  desconto: string;
  duracao: string;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  createdAt: string;
}

function describeCoupon(coupon: {
  percent_off?: number | null;
  amount_off?: number | null;
  currency?: string | null;
  duration?: string;
  duration_in_months?: number | null;
}): { desconto: string; duracao: string } {
  const desconto = coupon.percent_off
    ? `${coupon.percent_off}% off`
    : coupon.amount_off
      ? `R$ ${(coupon.amount_off / 100).toLocaleString("pt-BR")} off`
      : "—";
  const duracao =
    coupon.duration === "forever"
      ? "para sempre"
      : coupon.duration === "repeating"
        ? `${coupon.duration_in_months ?? 0} meses`
        : "primeira cobrança";
  return { desconto, duracao };
}

/** Cupons promocionais disponíveis no provedor de pagamento. */
export const listPromotions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ rows: PromotionRow[] } | { error: string }> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, email, "promocoes");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const list = await stripe.promotionCodes.list({ limit: 100 });

      const rows: PromotionRow[] = (list.data ?? []).map((promo: any) => ({
        id: promo.id,
        code: promo.code,
        active: Boolean(promo.active),
        ...describeCoupon(promo.coupon ?? promo.promotion?.coupon ?? {}),
        maxRedemptions: promo.max_redemptions ?? null,
        timesRedeemed: promo.times_redeemed ?? 0,
        expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null,
        createdAt: promo.created ? new Date(promo.created * 1000).toISOString() : "",
      }));

      return { rows };
    } catch (error) {
      const { friendlyStripeError } = await import("@/lib/subscriptions.server");
      return { error: friendlyStripeError(error) };
    }
  });

export interface CreatePromotionInput {
  environment: StripeEnv;
  code: string;
  percentOff?: number | null;
  amountOffCents?: number | null;
  /** once | repeating | forever */
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number | null;
  maxRedemptions?: number | null;
  expiresInDays?: number | null;
}

/** Cria um cupom e o código promocional correspondente. */
export const createPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreatePromotionInput) => {
    if (!/^[A-Z0-9_-]{3,40}$/.test((data.code ?? "").toUpperCase())) {
      throw new Error("Código inválido (use letras, números, - e _).");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; code: string } | { error: string }> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, email, "promocoes");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }

    if (!data.percentOff && !data.amountOffCents) {
      return { error: "Informe um desconto em % ou em reais." };
    }

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const code = data.code.toUpperCase();

      const coupon = await stripe.coupons.create({
        name: code,
        duration: data.duration,
        ...(data.duration === "repeating" && {
          duration_in_months: data.durationInMonths ?? 1,
        }),
        ...(data.percentOff
          ? { percent_off: data.percentOff }
          : { amount_off: data.amountOffCents!, currency: "brl" }),
      });

      await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code,
        ...(data.maxRedemptions ? { max_redemptions: data.maxRedemptions } : {}),
        ...(data.expiresInDays
          ? {
              expires_at: Math.floor(Date.now() / 1000) + data.expiresInDays * 86_400,
            }
          : {}),
      });

      const { recordAudit } = await import("@/lib/admin-audit.server");
      await recordAudit({
        actorId: context.userId,
        actorEmail: email,
        action: "promocao.criada",
        targetType: "promotion_code",
        targetId: code,
        after: { ...data, code },
      });

      return { ok: true, code };
    } catch (error) {
      const { friendlyStripeError } = await import("@/lib/subscriptions.server");
      return { error: friendlyStripeError(error) };
    }
  });

/** Ativa ou desativa um código promocional. */
export const togglePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; id: string; active: boolean }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, email, "promocoes");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      await stripe.promotionCodes.update(data.id, { active: data.active });

      const { recordAudit } = await import("@/lib/admin-audit.server");
      await recordAudit({
        actorId: context.userId,
        actorEmail: email,
        action: data.active ? "promocao.ativada" : "promocao.desativada",
        targetType: "promotion_code",
        targetId: data.id,
        after: { active: data.active },
      });
      return { ok: true };
    } catch (error) {
      const { friendlyStripeError } = await import("@/lib/subscriptions.server");
      return { error: friendlyStripeError(error) };
    }
  });
