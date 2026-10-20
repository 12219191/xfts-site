/** Regra pura do segundo fator (MFA) no Control Center. */
export const MFA_ROLES = ["superadmin", "suporte"] as const;

export type StepUpDecision = "ok" | "warn" | "deny";

/**
 * - Papéis fora de superadmin/suporte: ok (não exigido).
 * - Sessão aal2 (segundo fator verificado): ok.
 * - Sem aal2: "deny" se a obrigatoriedade já começou (enforceAfter <= agora),
 *   senão "warn" (período de migração; registra mfa.missing).
 */
export function stepUpDecision(input: {
  roles: string[];
  aal: string | null | undefined;
  enforceAfter: string | null | undefined;
  now?: number;
}): StepUpDecision {
  const needs = input.roles.some((r) => (MFA_ROLES as readonly string[]).includes(r));
  if (!needs) return "ok";
  if (input.aal === "aal2") return "ok";
  const t = input.enforceAfter ? Date.parse(input.enforceAfter) : NaN;
  if (Number.isFinite(t) && (input.now ?? Date.now()) >= t) return "deny";
  return "warn";
}

/** Formato dos códigos de recuperação: XXXX-XXXX-XXXX (base32 sem ambíguos). */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function hashRecoveryCode(userId: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${normalizeRecoveryCode(code)}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRecoveryCodes(n = 10): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const s = Array.from(bytes, (b) => ALPHA[b % ALPHA.length]).join("");
    out.push(`${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`);
  }
  return out;
}
