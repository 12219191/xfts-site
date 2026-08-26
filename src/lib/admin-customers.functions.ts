import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CustomerRow } from "@/lib/admin-customers.server";

type ListResult = { customers: CustomerRow[] } | { error: string };
type SeatsResult = { ok: true } | { error: string };
type SupportResult = { url: string } | { error: string };

/** Busca clientes por e-mail com seus produtos e entitlements. */
export const listAdminCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; environment?: string }) => data ?? {})
  .handler(async ({ data, context }): Promise<ListResult> => {
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(
        context.supabase,
        context.userId,
        (context.claims as { email?: string })?.email ?? "",
        "clientes",
      );
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }
    const { searchCustomers } = await import("@/lib/admin-customers.server");
    return {
      customers: await searchCustomers(data.search ?? "", data.environment ?? "live"),
    };
  });

/** Ajusta manualmente o limite de usuários de uma assinatura (motivo obrigatório). */
export const updateCustomerSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { subscriptionId: string; seats: number | null; reason: string }) => {
      if (!data?.subscriptionId) throw new Error("Assinatura inválida");
      if (!data.reason || data.reason.trim().length < 5) {
        throw new Error("Informe um motivo com pelo menos 5 caracteres.");
      }
      if (data.seats !== null && (!Number.isInteger(data.seats) || data.seats < 0)) {
        throw new Error("Limite de usuários inválido");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<SeatsResult> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, email, "clientes");
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }
    const { setSeatsOverride } = await import("@/lib/admin-customers.server");
    const result = await setSeatsOverride(data.subscriptionId, data.seats);
    if ("error" in result) return { error: result.error };

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "entitlement.seats_override",
      targetType: "subscription",
      targetId: data.subscriptionId,
      before: result.before,
      after: result.after,
      reason: data.reason.trim(),
    });
    return { ok: true };
  });

/** Gera um link de acesso de suporte ao sistema do cliente (auditado). */
export const createSupportAccessLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; app: string; reason: string }) => {
    if (!data?.userId || !data?.app) throw new Error("Dados incompletos");
    if (!data.reason || data.reason.trim().length < 5) {
      throw new Error("Informe o motivo do acesso de suporte (mínimo 5 caracteres).");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<SupportResult> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    try {
      await requireAdminModule(context.supabase, context.userId, email, "clientes");
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }

    const { loadUserDirectory } = await import("@/lib/admin-directory.server");
    const directory = await loadUserDirectory();
    const targetEmail = directory.get(data.userId)?.email ?? "";

    const { createSupportAccess } = await import("@/lib/admin-customers.server");
    const result = await createSupportAccess({
      userId: data.userId,
      email: targetEmail,
      app: data.app,
      adminId: context.userId,
    });

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "support.impersonation",
      targetType: "user",
      targetId: data.userId,
      after: { app: data.app, cliente: targetEmail, ok: !("error" in result) },
      reason: data.reason.trim(),
    });

    return result;
  });
