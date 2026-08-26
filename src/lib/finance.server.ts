/**
 * Fase 5 — Receita e financeiro (server-only).
 *
 * Reúne três frentes:
 * 1. Visão de receita: MRR/ARR por produto, evolução mensal e cohorts de retenção.
 * 2. Pagamentos: cobranças recentes no Stripe, com reembolso total ou parcial.
 * 3. Exportação contábil: faturas do período em formato tabular.
 */
import { ACTIVE_STATUSES, appKeyFromPriceId, getFlexusApp, planTierFromPriceId } from "@/lib/flexus-apps";
import { loadUserDirectory, monthlyRevenueFromPriceId } from "@/lib/admin-directory.server";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

export interface RevenueProductRow {
  key: string;
  name: string;
  clientes: number;
  mrr: number;
  arr: number;
  arpu: number;
  cortesias: number;
}

export interface RevenueMonthRow {
  /** AAAA-MM */
  mes: string;
  novos: number;
  cancelados: number;
  ativosFim: number;
  mrrFim: number;
  churnPct: number;
}

export interface RevenueCohortRow {
  mes: string;
  clientes: number;
  ativos: number;
  retencaoPct: number;
  mrr: number;
}

export interface RevenueOverview {
  environment: string;
  mrr: number;
  arr: number;
  arpu: number;
  clientesAtivos: number;
  cortesias: number;
  mrrCortesias: number;
  porProduto: RevenueProductRow[];
  meses: RevenueMonthRow[];
  cohorts: RevenueCohortRow[];
  reembolsos30d: { quantidade: number; valor: number };
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number): string[] {
  const out: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCMonth(d.getUTCMonth() - i);
    out.push(monthKey(d));
  }
  return out;
}

/** Fim (exclusivo) do mês AAAA-MM. */
function monthEnd(mes: string): Date {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 1));
}

export async function buildRevenueOverview(
  environment: string,
  months = 12,
): Promise<RevenueOverview> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, price_id, status, is_courtesy, created_at, updated_at, environment")
    .eq("environment", environment)
    .limit(5000);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: refunds } = await supabaseAdmin
    .from("finance_refunds")
    .select("amount_cents, created_at, environment")
    .eq("environment", environment)
    .gte("created_at", since)
    .limit(500);

  const rows = subs ?? [];

  let mrr = 0;
  let clientesAtivos = 0;
  let cortesias = 0;
  let mrrCortesias = 0;
  const porProduto = new Map<string, RevenueProductRow>();

  for (const s of rows) {
    const appKey = appKeyFromPriceId(s.price_id) ?? "outros";
    const app = getFlexusApp(appKey);
    const receita = monthlyRevenueFromPriceId(s.price_id);
    const ativo = ACTIVE_STATUSES.includes(s.status);
    if (!ativo) continue;

    clientesAtivos += 1;
    const valor = s.is_courtesy ? 0 : receita;
    mrr += valor;
    if (s.is_courtesy) {
      cortesias += 1;
      mrrCortesias += receita;
    }

    const entry = porProduto.get(appKey) ?? {
      key: appKey,
      name: app?.name ?? "Outros",
      clientes: 0,
      mrr: 0,
      arr: 0,
      arpu: 0,
      cortesias: 0,
    };
    entry.clientes += 1;
    entry.mrr += valor;
    if (s.is_courtesy) entry.cortesias += 1;
    porProduto.set(appKey, entry);
  }

  const produtos = [...porProduto.values()]
    .map((p) => ({ ...p, arr: p.mrr * 12, arpu: p.clientes ? p.mrr / p.clientes : 0 }))
    .sort((a, b) => b.mrr - a.mrr);

  // Evolução mensal: fotografia do fim de cada mês.
  const meses: RevenueMonthRow[] = [];
  let ativosMesAnterior: number | null = null;
  for (const mes of lastMonths(months)) {
    const fim = monthEnd(mes).getTime();
    const inicio = new Date(monthEnd(mes));
    inicio.setUTCMonth(inicio.getUTCMonth() - 1);
    const inicioMs = inicio.getTime();

    let novos = 0;
    let cancelados = 0;
    let ativosFim = 0;
    let mrrFim = 0;

    for (const s of rows) {
      const criado = s.created_at ? new Date(s.created_at).getTime() : null;
      const alterado = s.updated_at ? new Date(s.updated_at).getTime() : null;
      if (criado !== null && criado >= inicioMs && criado < fim) novos += 1;
      if (
        s.status === "canceled" &&
        alterado !== null &&
        alterado >= inicioMs &&
        alterado < fim
      ) {
        cancelados += 1;
      }
      const vivoNoFim =
        criado !== null &&
        criado < fim &&
        (s.status !== "canceled" || (alterado !== null && alterado >= fim));
      if (vivoNoFim) {
        ativosFim += 1;
        mrrFim += s.is_courtesy ? 0 : monthlyRevenueFromPriceId(s.price_id);
      }
    }

    const base = ativosMesAnterior ?? ativosFim + cancelados - novos;
    meses.push({
      mes,
      novos,
      cancelados,
      ativosFim,
      mrrFim,
      churnPct: base > 0 ? (cancelados / base) * 100 : 0,
    });
    ativosMesAnterior = ativosFim;
  }

  // Cohorts por mês de entrada.
  const cohortMap = new Map<string, RevenueCohortRow>();
  for (const s of rows) {
    if (!s.created_at) continue;
    const mes = monthKey(new Date(s.created_at));
    const entry = cohortMap.get(mes) ?? { mes, clientes: 0, ativos: 0, retencaoPct: 0, mrr: 0 };
    entry.clientes += 1;
    if (ACTIVE_STATUSES.includes(s.status)) {
      entry.ativos += 1;
      entry.mrr += s.is_courtesy ? 0 : monthlyRevenueFromPriceId(s.price_id);
    }
    cohortMap.set(mes, entry);
  }
  const cohorts = [...cohortMap.values()]
    .map((c) => ({ ...c, retencaoPct: c.clientes ? (c.ativos / c.clientes) * 100 : 0 }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, months);

  const reembolsos30d = (refunds ?? []).reduce(
    (acc, r) => ({ quantidade: acc.quantidade + 1, valor: acc.valor + (r.amount_cents ?? 0) / 100 }),
    { quantidade: 0, valor: 0 },
  );

  return {
    environment,
    mrr,
    arr: mrr * 12,
    arpu: clientesAtivos ? mrr / clientesAtivos : 0,
    clientesAtivos,
    cortesias,
    mrrCortesias,
    porProduto: produtos,
    meses,
    cohorts,
    reembolsos30d,
  };
}

export interface PaymentRow {
  id: string;
  createdAt: string;
  email: string;
  descricao: string;
  amount: number;
  refunded: number;
  currency: string;
  status: string;
  refundable: boolean;
  receiptUrl: string | null;
}

/** Cobranças recentes no Stripe (base para reembolso e conferência). */
export async function listRecentPayments(
  environment: StripeEnv,
  limit = 40,
): Promise<{ payments: PaymentRow[] } | { error: string }> {
  try {
    const stripe = createStripeClient(environment);
    const charges = await stripe.charges.list({ limit: Math.min(limit, 100) });
    const payments: PaymentRow[] = charges.data.map((c) => ({
      id: c.id,
      createdAt: new Date(c.created * 1000).toISOString(),
      email: c.billing_details?.email ?? c.receipt_email ?? "—",
      descricao: c.description ?? "—",
      amount: (c.amount ?? 0) / 100,
      refunded: (c.amount_refunded ?? 0) / 100,
      currency: (c.currency ?? "brl").toUpperCase(),
      status: c.status ?? "—",
      refundable:
        c.status === "succeeded" && (c.amount ?? 0) > (c.amount_refunded ?? 0) && !c.disputed,
      receiptUrl: c.receipt_url ?? null,
    }));
    return { payments };
  } catch (e) {
    return { error: getStripeErrorMessage(e) };
  }
}

export interface RefundInput {
  environment: StripeEnv;
  chargeId: string;
  /** Valor em reais; ausente = reembolso total. */
  amount?: number | null;
  reason: string;
  actorId: string;
  actorEmail: string;
}

/** Executa o reembolso no Stripe e registra em finance_refunds. */
export async function refundCharge(
  input: RefundInput,
): Promise<{ ok: true; refundId: string; amount: number } | { error: string }> {
  try {
    const stripe = createStripeClient(input.environment);
    const cents =
      input.amount && input.amount > 0 ? Math.round(input.amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      charge: input.chargeId,
      ...(cents ? { amount: cents } : {}),
      metadata: { motivo: input.reason.slice(0, 400), operador: input.actorEmail },
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("finance_refunds").insert({
      stripe_refund_id: refund.id,
      stripe_charge_id: input.chargeId,
      amount_cents: refund.amount ?? cents ?? 0,
      currency: (refund.currency ?? "brl").toUpperCase(),
      reason: input.reason,
      status: refund.status ?? "pending",
      environment: input.environment,
      created_by: input.actorId,
      created_by_email: input.actorEmail,
    } as never);

    return { ok: true, refundId: refund.id, amount: (refund.amount ?? 0) / 100 };
  } catch (e) {
    return { error: getStripeErrorMessage(e) };
  }
}

export interface InvoiceExportRow {
  numero: string;
  data: string;
  email: string;
  cliente: string;
  status: string;
  moeda: string;
  subtotal: number;
  imposto: number;
  total: number;
  pago: number;
  restante: number;
  assinatura: string;
  link: string;
}

/** Faturas do período para conferência contábil / exportação em CSV. */
export async function listInvoicesForExport(
  environment: StripeEnv,
  fromISO: string,
  toISO: string,
): Promise<{ invoices: InvoiceExportRow[] } | { error: string }> {
  try {
    const stripe = createStripeClient(environment);
    const gte = Math.floor(new Date(fromISO).getTime() / 1000);
    const lte = Math.floor(new Date(toISO).getTime() / 1000);
    const invoices: InvoiceExportRow[] = [];
    let startingAfter: string | undefined;

    for (let page = 0; page < 10; page++) {
      const list = await stripe.invoices.list({
        limit: 100,
        created: { gte, lte },
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const inv of list.data) {
        invoices.push({
          numero: inv.number ?? inv.id ?? "",
          data: new Date((inv.created ?? 0) * 1000).toISOString(),
          email: inv.customer_email ?? "—",
          cliente: inv.customer_name ?? "—",
          status: inv.status ?? "—",
          moeda: (inv.currency ?? "brl").toUpperCase(),
          subtotal: (inv.subtotal ?? 0) / 100,
          imposto: (inv.total_taxes ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0) / 100,
          total: (inv.total ?? 0) / 100,
          pago: (inv.amount_paid ?? 0) / 100,
          restante: (inv.amount_remaining ?? 0) / 100,
          assinatura:
            typeof (inv as { subscription?: unknown }).subscription === "string"
              ? ((inv as { subscription?: string }).subscription ?? "")
              : "",
          link: inv.invoice_pdf ?? inv.hosted_invoice_url ?? "",
        });
      }
      if (!list.has_more || list.data.length === 0) break;
      startingAfter = list.data[list.data.length - 1]?.id;
    }

    return { invoices };
  } catch (e) {
    return { error: getStripeErrorMessage(e) };
  }
}

export interface RefundLogRow {
  id: string;
  createdAt: string;
  chargeId: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  operador: string;
}

export async function listRefundLog(environment: string, limit = 50): Promise<RefundLogRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("finance_refunds")
    .select("*")
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    chargeId: r.stripe_charge_id,
    amount: (r.amount_cents ?? 0) / 100,
    currency: r.currency,
    reason: r.reason,
    status: r.status,
    operador: r.created_by_email ?? "—",
  }));
}

/** Resumo por produto/plano para conciliação (usa a base local). */
export async function buildPlanBreakdown(environment: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, price_id, status, is_courtesy")
    .eq("environment", environment)
    .limit(5000);

  const directory = await loadUserDirectory();
  const map = new Map<string, { produto: string; plano: string; clientes: number; mrr: number }>();
  for (const s of data ?? []) {
    if (!ACTIVE_STATUSES.includes(s.status)) continue;
    const appKey = appKeyFromPriceId(s.price_id) ?? "outros";
    const produto = getFlexusApp(appKey)?.name ?? "Outros";
    const plano = planTierFromPriceId(s.price_id);
    const key = `${produto}|${plano}`;
    const entry = map.get(key) ?? { produto, plano, clientes: 0, mrr: 0 };
    entry.clientes += 1;
    entry.mrr += s.is_courtesy ? 0 : monthlyRevenueFromPriceId(s.price_id);
    map.set(key, entry);
    void directory;
  }
  return [...map.values()].sort((a, b) => b.mrr - a.mrr);
}
