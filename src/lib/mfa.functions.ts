import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: never; userId: string; claims: unknown };
const emailOf = (c: unknown) => (c as { email?: string })?.email ?? "";
const aalOf = (c: unknown) => (c as { aal?: string })?.aal ?? "aal1";

async function rolesOf(ctx: Ctx) {
  const { loadAdminRoles } = await import("@/lib/admin-rbac.server");
  const roles = await loadAdminRoles(ctx.supabase, ctx.userId);
  if (roles.length === 0) throw new Error("Sua conta não é administradora.");
  return roles as string[];
}

export interface MfaStatus {
  aal: string;
  hasFactor: boolean;
  recoveryRemaining: number;
  enforceAfter: string | null;
  isSuperadmin: boolean;
  team?: Array<{ userId: string; email: string; roles: string[]; hasFactor: boolean }>;
}

export const getMfaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MfaStatus | { error: string }> => {
    try {
      const ctx = context as unknown as Ctx;
      const roles = await rolesOf(ctx);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { loadEnforceAfter } = await import("@/lib/mfa.server");
      const hasFactorFor = async (id: string) => {
        const { data } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: id });
        return (data?.factors ?? []).some((f) => f.status === "verified");
      };
      const { count } = await supabaseAdmin
        .from("admin_mfa_recovery_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.userId)
        .is("used_at", null);
      const isSuperadmin = roles.includes("superadmin");
      let team: MfaStatus["team"];
      if (isSuperadmin) {
        const [{ data: r }, { data: legacy }] = await Promise.all([
          supabaseAdmin.from("admin_roles").select("user_id, role"),
          supabaseAdmin.from("admin_users").select("user_id"),
        ]);
        const map = new Map<string, string[]>();
        for (const x of r ?? []) map.set(x.user_id, [...(map.get(x.user_id) ?? []), x.role]);
        for (const x of legacy ?? []) if (!map.has(x.user_id)) map.set(x.user_id, ["superadmin"]);
        const { loadUserDirectory } = await import("@/lib/admin-directory.server");
        const dir = await loadUserDirectory();
        team = await Promise.all(
          [...map.entries()].map(async ([id, rs]) => ({
            userId: id,
            email: dir.get(id)?.email ?? id,
            roles: rs,
            hasFactor: await hasFactorFor(id),
          })),
        );
      }
      return {
        aal: aalOf(ctx.claims),
        hasFactor: await hasFactorFor(ctx.userId),
        recoveryRemaining: count ?? 0,
        enforceAfter: await loadEnforceAfter(),
        isSuperadmin,
        team,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Acesso negado" };
    }
  });

/** Gera 10 códigos de recuperação (exige sessão aal2). Substitui os anteriores. */
export const generateMfaRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ codes: string[] } | { error: string }> => {
    const ctx = context as unknown as Ctx;
    await rolesOf(ctx);
    if (aalOf(ctx.claims) !== "aal2") return { error: "Confirme o código do app autenticador primeiro." };
    const { generateRecoveryCodes, hashRecoveryCode } = await import("@/lib/mfa-policy");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const codes = generateRecoveryCodes(10);
    const rows = await Promise.all(codes.map(async (c) => ({ user_id: ctx.userId, code_hash: await hashRecoveryCode(ctx.userId, c) })));
    await supabaseAdmin.from("admin_mfa_recovery_codes").delete().eq("user_id", ctx.userId);
    await supabaseAdmin.from("admin_mfa_recovery_codes").insert(rows);
    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({ actorId: ctx.userId, actorEmail: emailOf(ctx.claims), action: "mfa.recovery_codes_generated", targetType: "user", targetId: ctx.userId });
    return { codes };
  });

/** Usa um código de recuperação: remove o fator perdido para cadastrar um novo. */
export const useMfaRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => {
    if (!d?.code || d.code.length > 40) throw new Error("Código inválido");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const ctx = context as unknown as Ctx;
    await rolesOf(ctx);
    const { consumeRecoveryCode, wipeFactors } = await import("@/lib/mfa.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");
    const ok = await consumeRecoveryCode(ctx.userId, data.code);
    await recordAudit({ actorId: ctx.userId, actorEmail: emailOf(ctx.claims), action: ok ? "mfa.recovery_used" : "mfa.recovery_denied", targetType: "user", targetId: ctx.userId });
    if (!ok) return { error: "Código inválido ou já usado." };
    await wipeFactors(ctx.userId);
    return { ok: true };
  });

/** Superadmin (com MFA verificado) redefine o fator de OUTRA pessoa. */
export const resetUserMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; reason: string }) => {
    if (!d?.userId) throw new Error("Usuário inválido");
    if (!d.reason || d.reason.trim().length < 5) throw new Error("Informe o motivo (mínimo 5 caracteres).");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; removed: number } | { error: string }> => {
    const ctx = context as unknown as Ctx;
    const roles = await rolesOf(ctx);
    if (!roles.includes("superadmin")) return { error: "Só superadmin redefine o segundo fator." };
    if (aalOf(ctx.claims) !== "aal2") return { error: "Confirme o seu próprio segundo fator antes." };
    if (data.userId === ctx.userId) return { error: "Use um código de recuperação para o seu próprio fator." };
    const { wipeFactors } = await import("@/lib/mfa.server");
    const removed = await wipeFactors(data.userId);
    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({ actorId: ctx.userId, actorEmail: emailOf(ctx.claims), action: "mfa.reset", targetType: "user", targetId: data.userId, after: { fatores_removidos: removed }, reason: data.reason.trim() });
    return { ok: true, removed };
  });

/** Define (ou limpa) a data a partir da qual o MFA vira obrigatório. */
export const setMfaEnforceAfter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { date: string | null }) => {
    if (d.date !== null && !Number.isFinite(Date.parse(d.date))) throw new Error("Data inválida");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const ctx = context as unknown as Ctx;
    const roles = await rolesOf(ctx);
    if (!roles.includes("superadmin")) return { error: "Só superadmin define o prazo." };
    if (aalOf(ctx.claims) !== "aal2") return { error: "Confirme o seu segundo fator antes." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("integration_settings").upsert({ key: "mfa.enforce_after", value: data.date as never, updated_by: ctx.userId, updated_at: new Date().toISOString() });
    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({ actorId: ctx.userId, actorEmail: emailOf(ctx.claims), action: "mfa.enforce_after_set", targetType: "setting", targetId: "mfa.enforce_after", after: { date: data.date } });
    return { ok: true };
  });
