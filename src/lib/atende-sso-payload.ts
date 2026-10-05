// Contrato do POST /api/public/sso/verify para app=atende (resposta positiva).
import type { CreditCycle } from "@/lib/atende-credit-cycle";

export interface AtendeSsoInput {
  userId: string;
  email: string | null | undefined;
  planoNome: string | null;
  environment: "live" | "sandbox";
  features: Record<string, unknown>;
  limites: Record<string, number | null | undefined>;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  creditCycle: CreditCycle;
}

export function buildAtendeSsoPayload(i: AtendeSsoInput) {
  return {
    user_id: i.userId,
    email: i.email,
    produto: "atende" as const,
    plano: i.planoNome,
    papel: "owner" as const,
    purpose: "owner" as const,
    environment: i.environment,
    limite_usuarios: i.limites["usuarios"] ?? null,
    recursos: i.features,
    limites: i.limites,
    status: i.status,
    ativo: true,
    acesso_ate: i.currentPeriodEnd ?? null,
    cancelamento_agendado: i.cancelAtPeriodEnd ?? false,
    credit_cycle: i.creditCycle,
  };
}
