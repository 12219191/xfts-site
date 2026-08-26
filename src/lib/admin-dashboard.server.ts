/** Agregações do dashboard executivo (server-only). */
import { ACTIVE_STATUSES, appKeyFromPriceId, getFlexusApp, planTierFromPriceId } from "@/lib/flexus-apps";
import { loadUserDirectory, monthlyRevenueFromPriceId } from "@/lib/admin-directory.server";

export interface DashboardProductRow {
  key: string;
  name: string;
  clientes: number;
  mrr: number;
}

export interface DashboardAlertRow {
  id: string;
  email: string;
  produto: string;
  plano: string;
  status: string;
  detalhe: string | null;
}

export interface DashboardOpsAlerts {
  webhooksFalhos24h: number;
  provisionamentosEsgotados: number;
  sistemasComProblema: string[];
}

export interface DashboardData {
  mrr: number;
  clientesAtivos: number;
  cortesias: number;
  cancelamentosMes: number;
  inadimplentes: number;
  porProduto: DashboardProductRow[];
  assinaturasComProblema: DashboardAlertRow[];
  cortesiasTerminando: DashboardAlertRow[];
  pagamentosFalhos: DashboardAlertRow[];
  operacional: DashboardOpsAlerts;
  environment: string;
}

export async function buildDashboard(environment: string): Promise<DashboardData> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "id, user_id, price_id, status, environment, is_courtesy, current_period_end, cancel_at_period_end, created_at, updated_at",
    )
    .eq("environment", environment)
    .limit(2000);

  const { data: dunning } = await supabaseAdmin
    .from("dunning_state")
    .select("stripe_subscription_id, user_id, email, price_id, amount_due, grace_until, resolved_at, blocked_at")
    .eq("environment", environment)
    .is("resolved_at", null)
    .limit(500);

  const { buildOperationalAlerts } = await import("@/lib/reliability.server");
  const operacional = await buildOperationalAlerts();

  const directory = await loadUserDirectory();
  const rows = subs ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let mrr = 0;
  let clientesAtivos = 0;
  let cortesias = 0;
  let cancelamentosMes = 0;
  const porProduto = new Map<string, DashboardProductRow>();
  const assinaturasComProblema: DashboardAlertRow[] = [];
  const cortesiasTerminando: DashboardAlertRow[] = [];

  const soon = Date.now() + 7 * 24 * 60 * 60 * 1000;

  for (const s of rows) {
    const appKey = appKeyFromPriceId(s.price_id) ?? "outros";
    const app = getFlexusApp(appKey);
    const email = directory.get(s.user_id)?.email ?? s.user_id.slice(0, 8);
    const plano = planTierFromPriceId(s.price_id);
    const active = ACTIVE_STATUSES.includes(s.status);

    if (active) {
      clientesAtivos += 1;
      const revenue = s.is_courtesy ? 0 : monthlyRevenueFromPriceId(s.price_id);
      mrr += revenue;
      const entry = porProduto.get(appKey) ?? {
        key: appKey,
        name: app?.name ?? "Outros",
        clientes: 0,
        mrr: 0,
      };
      entry.clientes += 1;
      entry.mrr += revenue;
      porProduto.set(appKey, entry);
    }

    if (s.is_courtesy && active) {
      cortesias += 1;
      const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
      if (end && end <= soon) {
        cortesiasTerminando.push({
          id: s.id,
          email,
          produto: app?.name ?? appKey,
          plano,
          status: "cortesia",
          detalhe: s.current_period_end,
        });
      }
    }

    if (s.status === "canceled" && s.updated_at && new Date(s.updated_at) >= monthStart) {
      cancelamentosMes += 1;
    }

    if (s.status === "past_due" || s.status === "unpaid" || s.status === "incomplete") {
      assinaturasComProblema.push({
        id: s.id,
        email,
        produto: app?.name ?? appKey,
        plano,
        status: s.status,
        detalhe: s.current_period_end,
      });
    }
  }

  const pagamentosFalhos: DashboardAlertRow[] = (dunning ?? []).map((d) => ({
    id: d.stripe_subscription_id,
    email: d.email ?? (d.user_id ? directory.get(d.user_id)?.email ?? "—" : "—"),
    produto: getFlexusApp(appKeyFromPriceId(d.price_id) ?? "")?.name ?? "—",
    plano: planTierFromPriceId(d.price_id),
    status: d.blocked_at ? "bloqueado" : "em carência",
    detalhe: d.grace_until,
  }));

  return {
    mrr,
    clientesAtivos,
    cortesias,
    cancelamentosMes,
    inadimplentes: pagamentosFalhos.length,
    porProduto: [...porProduto.values()].sort((a, b) => b.mrr - a.mrr),
    assinaturasComProblema,
    cortesiasTerminando,
    pagamentosFalhos,
    operacional,
    environment,
  };
}
