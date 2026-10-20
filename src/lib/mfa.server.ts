import { stepUpDecision, hashRecoveryCode } from "@/lib/mfa-policy";

export class StepUpRequiredError extends Error {
  constructor() {
    super("Confirme o segundo fator (app autenticador) em Segurança da conta antes desta ação.");
  }
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function loadEnforceAfter(): Promise<string | null> {
  const db = await admin();
  const { data } = await db.from("integration_settings").select("value").eq("key", "mfa.enforce_after").maybeSingle();
  const v = data?.value as unknown;
  return typeof v === "string" ? v : null;
}

/**
 * Exige segundo fator verificado NO SERVIDOR (claim aal do token) para
 * superadmin/suporte antes de ações sensíveis. Durante a migração apenas
 * registra mfa.missing.
 */
export async function requireStepUp(ctx: {
  userId: string;
  claims: unknown;
  roles?: string[];
  action: string;
}): Promise<void> {
  const claims = ctx.claims as { aal?: string; email?: string };
  let roles = ctx.roles;
  if (!roles) {
    const db = await admin();
    const { data: r } = await db.from("admin_roles").select("role").eq("user_id", ctx.userId);
    roles = (r ?? []).map((x) => x.role as string);
    if (roles.length === 0) {
      const { data: legacy } = await db.from("admin_users").select("id").eq("user_id", ctx.userId).maybeSingle();
      if (legacy) roles = ["superadmin"];
    }
  }
  const decision = stepUpDecision({ roles, aal: claims?.aal, enforceAfter: await loadEnforceAfter() });
  if (decision === "ok") return;
  const { recordAudit } = await import("@/lib/admin-audit.server");
  await recordAudit({
    actorId: ctx.userId,
    actorEmail: claims?.email ?? "",
    action: decision === "deny" ? "mfa.denied" : "mfa.missing",
    targetType: "action",
    targetId: ctx.action,
  });
  if (decision === "deny") throw new StepUpRequiredError();
}

/** Consome um código de recuperação (uso único). Retorna true se válido. */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const db = await admin();
  const hash = await hashRecoveryCode(userId, code);
  const { data } = await db
    .from("admin_mfa_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("code_hash", hash)
    .is("used_at", null)
    .select("id");
  return (data ?? []).length === 1;
}

/** Remove todos os fatores e códigos de um usuário (recuperação/redefinição). */
export async function wipeFactors(userId: string): Promise<number> {
  const db = await admin();
  const { data } = await db.auth.admin.mfa.listFactors({ userId });
  let n = 0;
  for (const f of data?.factors ?? []) {
    const { error } = await db.auth.admin.mfa.deleteFactor({ userId, id: f.id });
    if (!error) n++;
  }
  await db.from("admin_mfa_recovery_codes").delete().eq("user_id", userId);
  return n;
}
