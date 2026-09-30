/**
 * Regras puras do POST /api/public/capability-check (sem I/O, testáveis).
 *
 * O `acting_as` enviado pelo SaaS NUNCA concede privilégio: o hub só valida o
 * valor e deriva o escopo efetivo da identidade que ele mesmo consegue provar.
 * Hoje a única identidade verificável é "user_id é o titular da assinatura
 * ativa deste app" (subscriptions.user_id). Membros do SaaS não têm identidade
 * no hub; logo não herdam nada do titular — ficam negados por padrão.
 */
import type { CapabilityViewer } from "@/lib/capabilities";

/** Valores aceitos de sistemas externos. Escopos internos XFTS são rejeitados. */
export const EXTERNAL_ACTING_AS = ["TENANT", "TENANT_ADMIN"] as const;
export type ExternalActingAs = (typeof EXTERNAL_ACTING_AS)[number];

const INTERNAL = new Set(["XFTS_SUPPORT", "XFTS_SUPERADMIN", "SYSTEM"]);

export type ActingAsParse =
  | { ok: true; value: ExternalActingAs }
  | { ok: false; status: 400 | 403; error: string };

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
 * Escopo efetivo a partir do que o hub verificou.
 * `isVerifiedHolder` = user_id é titular de assinatura ATIVA deste mesmo app.
 * Não-titular → null (negar). Titular → administrador do próprio tenant.
 */
export function verifiedViewer(isVerifiedHolder: boolean): CapabilityViewer | null {
  if (!isVerifiedHolder) return null;
  return { actingAs: "TENANT_ADMIN", isXftsSupport: false, isXftsSuperadmin: false };
}
