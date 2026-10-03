// Contrato do GET /api/public/entitlements?app=atende consumido pelo cliente Atende.
// `produto: "atende"` é obrigatório em todas as respostas (positiva e negativa).
export interface AtendeEntInput {
  planoNome?: string | null;
  denialReason?: string | null;
  features: Record<string, unknown>;
  limites: Record<string, number | null | undefined>;
}
export interface AtendeSubInput {
  status: string;
  seats_used?: number | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

export function buildAtendeEntitlementsPayload(
  ent: AtendeEntInput,
  s: AtendeSubInput | null,
  capabilities: string[],
) {
  return {
    produto: "atende" as const,
    ativo: !!s,
    status: s?.status ?? "none",
    plano: s ? ent.planoNome ?? null : null,
    papel: "owner" as const,
    environment: s ? ("live" as const) : null,
    motivo: ent.denialReason ?? null,
    limite_usuarios: s ? (ent.limites["usuarios"] ?? null) : 0,
    usuarios_em_uso: s?.seats_used ?? 0,
    recursos: s ? ent.features : {},
    limites: s ? ent.limites : {},
    capabilities: s ? capabilities : [],
    acesso_ate: s?.current_period_end ?? null,
    cancelamento_agendado: s?.cancel_at_period_end ?? false,
  };
}
