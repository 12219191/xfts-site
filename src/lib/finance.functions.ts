import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  InvoiceExportRow,
  PaymentRow,
  RefundLogRow,
  RevenueOverview,
} from "@/lib/finance.server";

type Env = "sandbox" | "live";

async function guard(
  supabase: unknown,
  userId: string,
  email: string,
): Promise<string | null> {
  const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
  try {
    await requireAdminModule(supabase as never, userId, email, "financeiro");
    return null;
  } catch (e) {
    if (e instanceof AdminAccessError) return e.message;
    throw e;
  }
}

const emailOf = (claims: unknown) => (claims as { email?: string })?.email ?? "";

/** Visão de receita: MRR/ARR por produto, evolução mensal e cohorts. */
export const getRevenueOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment?: Env } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<RevenueOverview | { error: string }> => {
    const denied = await guard(context.supabase, context.userId, emailOf(context.claims));
    if (denied) return { error: denied };
    const { buildRevenueOverview } = await import("@/lib/finance.server");
    return buildRevenueOverview(data.environment ?? "live");
  });

/** Cobranças recentes no Stripe + histórico de reembolsos já executados. */
export const getPaymentsAndRefunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment?: Env } | undefined) => data ?? {})
  .handler(
    async ({
      data,
      context,
    }): Promise<{ payments: PaymentRow[]; refunds: RefundLogRow[] } | { error: string }> => {
      const denied = await guard(context.supabase, context.userId, emailOf(context.claims));
      if (denied) return { error: denied };
      const env = data.environment ?? "live";
      const { listRecentPayments, listRefundLog } = await import("@/lib/finance.server");
      const result = await listRecentPayments(env);
      if ("error" in result) return { error: result.error };
      return { payments: result.payments, refunds: await listRefundLog(env) };
    },
  );

/** Reembolsa uma cobrança (total ou parcial), com motivo obrigatório e auditoria. */
export const refundPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { environment: Env; chargeId: string; amount?: number | null; reason: string }) => {
      if (!data?.chargeId?.startsWith("ch_") && !data?.chargeId?.startsWith("py_")) {
        throw new Error("Cobrança inválida");
      }
      if (data.environment !== "sandbox" && data.environment !== "live") {
        throw new Error("Ambiente inválido");
      }
      if (!data.reason || data.reason.trim().length < 5) {
        throw new Error("Informe um motivo com pelo menos 5 caracteres.");
      }
      if (data.amount != null && (!(data.amount > 0) || data.amount > 1_000_000)) {
        throw new Error("Valor de reembolso inválido");
      }
      return data;
    },
  )
  .handler(
    async ({ data, context }): Promise<{ ok: true; refundId: string; amount: number } | { error: string }> => {
      const email = emailOf(context.claims);
      const denied = await guard(context.supabase, context.userId, email);
      if (denied) return { error: denied };
      { const m = await (await import("@/lib/mfa.server")).stepUpError(context as never, "finance.refund"); if (m) return { error: m }; }

      const { refundCharge } = await import("@/lib/finance.server");
      const result = await refundCharge({
        environment: data.environment,
        chargeId: data.chargeId,
        amount: data.amount ?? null,
        reason: data.reason.trim(),
        actorId: context.userId,
        actorEmail: email,
      });

      const { recordAudit } = await import("@/lib/admin-audit.server");
      await recordAudit({
        actorId: context.userId,
        actorEmail: email,
        action: "error" in result ? "reembolso.falhou" : "reembolso.executado",
        targetType: "stripe_charge",
        targetId: data.chargeId,
        after: result,
        reason: data.reason.trim(),
      });

      return result;
    },
  );

/** Faturas do período para exportação contábil. */
export const getInvoiceExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: Env; from: string; to: string }) => {
    if (!data?.from || !data?.to) throw new Error("Informe o período");
    if (Number.isNaN(Date.parse(data.from)) || Number.isNaN(Date.parse(data.to))) {
      throw new Error("Período inválido");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ invoices: InvoiceExportRow[] } | { error: string }> => {
    const denied = await guard(context.supabase, context.userId, emailOf(context.claims));
    if (denied) return { error: denied };
    const { listInvoicesForExport } = await import("@/lib/finance.server");
    return listInvoicesForExport(data.environment, data.from, data.to);
  });

/** Receita por produto e plano (base local), para conciliação. */
export const getPlanBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment?: Env } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    const denied = await guard(context.supabase, context.userId, emailOf(context.claims));
    if (denied) return { error: denied } as const;
    const { buildPlanBreakdown } = await import("@/lib/finance.server");
    return { rows: await buildPlanBreakdown(data.environment ?? "live") };
  });
