import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CustomerTimeline } from "@/lib/customer-timeline.server";

type TimelineResult = CustomerTimeline | { error: string };
type MutationResult = { ok: true } | { error: string };

async function guard(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<string | null> {
  const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
  try {
    await requireAdminModule(supabase, userId, email, "clientes");
    return null;
  } catch (e) {
    if (e instanceof AdminAccessError) return e.message;
    throw e;
  }
}


/** Histórico unificado do cliente (assinaturas, faturas, e-mails, acessos, leads, ações internas). */
export const getCustomerTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; email?: string; environment?: string }) => {
    if (!data?.userId) throw new Error("Cliente inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<TimelineResult> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const denied = await guard(context.supabase, context.userId, email);
    if (denied) return { error: denied };

    const { buildCustomerTimeline } = await import("@/lib/customer-timeline.server");
    return buildCustomerTimeline({
      userId: data.userId,
      email: data.email ?? "",
      environment: data.environment ?? "live",
    });
  });

/** Registra uma nota interna sobre o cliente (auditada). */
export const createCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      userId: string;
      email?: string;
      body: string;
      kind?: string;
      pinned?: boolean;
    }) => {
      if (!data?.userId) throw new Error("Cliente inválido");
      if (!data.body || data.body.trim().length < 3) {
        throw new Error("Escreva uma nota com pelo menos 3 caracteres.");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const denied = await guard(context.supabase, context.userId, email);
    if (denied) return { error: denied };
    { const m = await (await import("@/lib/mfa.server")).stepUpError(context as never, "customer.note_create"); if (m) return { error: m }; }

    const { addCustomerNote } = await import("@/lib/customer-timeline.server");
    const result = await addCustomerNote({
      customerUserId: data.userId,
      customerEmail: data.email ?? "",
      body: data.body.trim(),
      kind: data.kind ?? "nota",
      pinned: data.pinned ?? false,
      authorId: context.userId,
      authorEmail: email,
    });
    if ("error" in result) return result;

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "support.note_created",
      targetType: "user",
      targetId: data.userId,
      after: { tipo: data.kind ?? "nota", fixada: data.pinned ?? false },
      reason: data.body.trim().slice(0, 200),
    });
    return { ok: true };
  });

/** Remove uma nota interna (auditada). */
export const deleteCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { noteId: string; userId: string }) => {
    if (!data?.noteId) throw new Error("Nota inválida");
    return data;
  })
  .handler(async ({ data, context }): Promise<MutationResult> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const denied = await guard(context.supabase, context.userId, email);
    if (denied) return { error: denied };
    { const m = await (await import("@/lib/mfa.server")).stepUpError(context as never, "customer.note_delete"); if (m) return { error: m }; }

    const { removeCustomerNote } = await import("@/lib/customer-timeline.server");
    const result = await removeCustomerNote(data.noteId);
    if ("error" in result) return result;

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "support.note_deleted",
      targetType: "user",
      targetId: data.userId,
      before: { noteId: data.noteId },
    });
    return { ok: true };
  });
