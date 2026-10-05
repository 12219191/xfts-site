// Corpo do provisionamento do FLEXUS | Atende. Só live; plano precisa existir no
// catálogo (nome real Basic/Standard/Corporate) — sem plano reconhecido, bloqueia.
import { buildCreditCycle, type CreditCycle } from "@/lib/atende-credit-cycle";

export const ATENDE_LOOKUP_PREFIX = "flexus_atende_";

export interface AtendeProvisionInput {
  event: "created" | "updated" | "canceled" | "payment_failed";
  userId: string;
  priceId: string;
  status: string | null;
  accessUntil: string | null;
  environment: string;
  planoNome: string | null;
  features: Record<string, boolean>;
  limites: Record<string, number | null>;
  timestamp: string;
  creditCycle?: CreditCycle;
}

export type AtendeProvisionResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string };

export function buildAtendeProvisionBody(i: AtendeProvisionInput): AtendeProvisionResult {
  if (i.environment !== "live") return { ok: false, error: "atende: só ambiente live provisiona" };
  if (!i.priceId.startsWith(ATENDE_LOOKUP_PREFIX)) return { ok: false, error: "atende: preço não pertence ao Atende" };
  if (!i.planoNome) return { ok: false, error: "atende: plano não reconhecido no catálogo" };
  const canceled = i.event === "canceled";
  return {
    ok: true,
    body: {
      event: i.event,
      user_id: i.userId,
      produto: "atende",
      plano: i.planoNome,
      limite_usuarios: canceled ? 0 : (i.limites["usuarios"] ?? null),
      recursos: canceled ? {} : i.features,
      limites: canceled ? {} : i.limites,
      price_id: i.priceId,
      status: i.status,
      acesso_ate: i.accessUntil,
      environment: "live",
      timestamp: i.timestamp,
      credit_cycle: canceled || !i.creditCycle ? buildCreditCycle(null, null) : i.creditCycle,
    },
  };
}
