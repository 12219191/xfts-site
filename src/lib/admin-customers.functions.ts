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

/**
 * Gera o acesso de suporte ao sistema do cliente (auditado).
 * Apps com a Sessão de Suporte XFTS ligada recebem a sessão nova (papel interno,
 * identidade própria). Os demais seguem no fluxo antigo até implementarem o kit.
 */
export const createSupportAccessLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      userId: string;
      app: string;
      reason: string;
      role?: "XFTS_SUPPORT" | "XFTS_SUPERADMIN";
      ticket?: string | null;
      environment?: string;
    }) => {
      if (!data?.userId || !data?.app) throw new Error("Dados incompletos");
      if (!data.reason || data.reason.trim().length < 5) {
        throw new Error("Informe o motivo do acesso de suporte (mínimo 5 caracteres).");
      }
      if (data.reason.length > 500) throw new Error("Motivo muito longo.");
      if (data.role && data.role !== "XFTS_SUPPORT" && data.role !== "XFTS_SUPERADMIN") {
        throw new Error("Papel inválido");
      }
      if (data.ticket && data.ticket.length > 80) throw new Error("Ticket muito longo.");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<SupportResult & { flow?: "session" | "legacy" }> => {
    const claims = context.claims as { email?: string; user_metadata?: { full_name?: string; name?: string } };
    const email = claims?.email ?? "";
    const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
    let identity;
    try {
      identity = await requireAdminModule(context.supabase, context.userId, email, "clientes");
    } catch (e) {
      if (e instanceof AdminAccessError) return { error: e.message };
      throw e;
    }

    const { supportFlagEnabled, issueSupportSession } = await import("@/lib/support-session.server");
    if (await supportFlagEnabled(data.app)) {
      const role = data.role ?? "XFTS_SUPPORT";
      if (role === "XFTS_SUPERADMIN" && !identity.roles.includes("superadmin")) {
        return { error: "Só superadmin pode abrir sessão com leitura e escrita." };
      }
      const r = await issueSupportSession({
        actor: {
          id: context.userId,
          email,
          name: claims?.user_metadata?.full_name ?? claims?.user_metadata?.name ?? "",
        },
        role,
        tenantId: data.userId,
        appKey: data.app,
        reason: data.reason.trim(),
        ticket: data.ticket?.trim() || null,
        environment: data.environment === "sandbox" ? "sandbox" : "live",
      });
      return "error" in r ? r : { url: r.url, flow: "session" };
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
      after: { app: data.app, cliente: targetEmail, ok: !("error" in result), fluxo: "antigo" },
      reason: data.reason.trim(),
    });

    return "error" in result ? result : { ...result, flow: "legacy" };
  });
