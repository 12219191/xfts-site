/**
 * Regras de SSO específicas do FLEXUS | Atende (sem banco, testáveis).
 * Os demais sistemas não passam por aqui.
 */
import { ACTIVE_STATUSES } from "@/lib/flexus-apps";

export const ATENDE_APP = "atende";
export type PaymentEnv = "live" | "sandbox";

export function isPaymentEnv(v: unknown): v is PaymentEnv {
  return v === "live" || v === "sandbox";
}

/**
 * Só acesso do titular: purpose "owner" ou ausente (token legado).
 * Qualquer outro valor (inclusive "support") é recusado — no token assinado
 * OU no registro do token no banco.
 */
export function atendePurposeAllowed(
  tokenPurpose: string | null | undefined,
  rowPurpose?: string | null,
): boolean {
  const okToken = tokenPurpose === undefined || tokenPurpose === null || tokenPurpose === "owner";
  const okRow = rowPurpose === undefined || rowPurpose === null || rowPurpose === "owner";
  return okToken && okRow;
}

export interface AtendeSubRow {
  price_id: string;
  status: string;
  current_period_end: string | null;
  environment: string;
  is_courtesy?: boolean | null;
}

export type AtendeResolution =
  | { kind: "ok"; sub: AtendeSubRow; environment: PaymentEnv }
  | { kind: "none" }
  | { kind: "ambiguous"; count: number };

function grants(s: AtendeSubRow, now: number): boolean {
  const periodOk = !s.current_period_end || new Date(s.current_period_end).getTime() > now;
  return periodOk && (ACTIVE_STATUSES.includes(s.status) || s.status === "canceled");
}

/**
 * Seleção da assinatura do Atende para um ambiente:
 * 1. considera só linhas do Atende cujo `environment` é exatamente o pedido
 *    (cortesia inclusa, mas também presa ao próprio ambiente — sandbox
 *    nunca libera live, e vice-versa);
 * 2. dentre elas, só as que liberam acesso agora;
 * 3. exatamente uma → usa; zero → sem acesso; mais de uma → ambíguo (nega).
 * Não existe "a mais recente vence".
 */
export function resolveAtendeSubscription(
  rows: AtendeSubRow[],
  env: PaymentEnv,
  isAtende: (priceId: string) => boolean,
  now = Date.now(),
): AtendeResolution {
  const granting = rows.filter(
    (r) => isAtende(r.price_id) && r.environment === env && grants(r, now),
  );
  if (granting.length === 1) return { kind: "ok", sub: granting[0]!, environment: env };
  if (granting.length === 0) return { kind: "none" };
  return { kind: "ambiguous", count: granting.length };
}
