/**
 * Regras puras do POST /api/public/capability-check (sem I/O, testáveis).
 *
 * Limite de confiança (contrato atual, v1):
 *  - A chave x-flexus-app-key autentica APENAS o backend do SaaS (qual app chama).
 *  - `user_id` identifica o titular para cobrança (subscriptions.user_id); ele NÃO
 *    prova quem é o ator da sessão — é afirmado pelo SaaS no corpo.
 *  - `acting_as` é o papel do ator segundo o RBAC do SaaS (fonte autoritativa do
 *    papel dentro do tenant é o próprio SaaS). O hub não consegue verificá-lo.
 *
 * Por isso o hub:
 *  - nunca ELEVA o papel: o efetivo é no máximo o declarado (teto);
 *  - valida o enum (desconhecido = 400) e recusa escopos internos (403);
 *  - exige assinatura ativa do titular NESTE app (entitlement, não identidade).
 * Um SaaS comprometido que declare TENANT_ADMIN falsamente não é detectável em
 * v1 — ver proposta de contrato v2 (asserção de ator emitida pelo hub).
 */
import type { CapabilityViewer } from "@/lib/capabilities";

export const EXTERNAL_ACTING_AS = ["TENANT", "TENANT_ADMIN"] as const;
export type ExternalActingAs = (typeof EXTERNAL_ACTING_AS)[number];

const INTERNAL = new Set(["XFTS_SUPPORT", "XFTS_SUPERADMIN", "SYSTEM"]);

export type ActingAsParse =
  | { ok: true; value: ExternalActingAs }
  | { ok: false; status: 400 | 403; error: string };

/** Ausente = TENANT (menor privilégio). */
export function parseActingAs(raw: unknown): ActingAsParse {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: "TENANT" };
  if (typeof raw !== "string") return { ok: false, status: 400, error: "acting_as inválido" };
  if (INTERNAL.has(raw)) {
    return { ok: false, status: 403, error: "Escopo interno XFTS não pode ser solicitado por sistema externo" };
  }
  if ((EXTERNAL_ACTING_AS as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as ExternalActingAs };
  }
  return { ok: false, status: 400, error: "acting_as inválido" };
}

/**
 * Viewer efetivo: sem titular ativo no app → null (negar). Com titular ativo →
 * o papel declarado pelo SaaS, nunca acima dele, nunca interno XFTS.
 */
export function effectiveViewer(
  holderActiveForApp: boolean,
  declared: ExternalActingAs,
): CapabilityViewer | null {
  if (!holderActiveForApp) return null;
  return { actingAs: declared, isXftsSupport: false, isXftsSuperadmin: false };
}
