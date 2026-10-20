/**
 * Regras do FLEXUS | Flow (sem banco, testáveis). Os demais sistemas não passam por aqui.
 */
import { ACTIVE_STATUSES } from "@/lib/flexus-apps";

export interface FlowSubRow {
  price_id: string;
  status: string;
  current_period_start?: string | null;
  current_period_end: string | null;
  environment: string;
  created_at?: string | null;
}

function grants(s: FlowSubRow, now: number): boolean {
  const periodOk = !s.current_period_end || new Date(s.current_period_end).getTime() > now;
  return periodOk && (ACTIVE_STATUSES.includes(s.status) || s.status === "canceled");
}

/**
 * Escolhe a assinatura do Flow (linhas já ordenadas da mais recente para a mais antiga):
 * live ativa > sandbox ativa > a mais recente (inativa). Sandbox nunca vira "live".
 */
export function pickFlowSub<T extends FlowSubRow>(
  rows: T[],
  isFlow: (priceId: string) => boolean,
  now = Date.now(),
): T | null {
  const flow = rows.filter((r) => isFlow(r.price_id));
  return (
    flow.find((r) => r.environment === "live" && grants(r, now)) ??
    flow.find((r) => r.environment === "sandbox" && grants(r, now)) ??
    flow[0] ??
    null
  );
}

export function flowEnvironment(s: FlowSubRow | null): "sandbox" | "live" | null {
  return s && (s.environment === "live" || s.environment === "sandbox") ? s.environment : null;
}

/** Campos aditivos do Flow. No Stripe, durante o teste o período corrente é o próprio teste. */
export function flowPeriodFields(s: FlowSubRow | null) {
  return {
    periodo_inicio: s?.current_period_start ?? null,
    trial_fim: s?.status === "trialing" ? (s.current_period_end ?? null) : null,
  };
}

/** O Flow só aceita acesso do titular; suporte usa a Sessão de Suporte XFTS. */
export function flowPurposeAllowed(tokenPurpose?: string | null, rowPurpose?: string | null) {
  return tokenPurpose !== "support" && rowPurpose !== "support";
}
