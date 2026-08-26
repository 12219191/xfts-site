import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailQueueRow, EmailQueueStats } from "@/lib/email-queue.server";
import type { CronHealth } from "@/lib/cron-monitor.server";

type EmailQueueResult = { rows: EmailQueueRow[]; stats: EmailQueueStats } | { error: string };
type CronResult = CronHealth | { error: string };
type ActionResult = { ok: true } | { error: string };

async function guard(context: {
  supabase: never;
  userId: string;
  claims: unknown;
}): Promise<{ email: string } | { error: string }> {
  const { requireAdminModule, AdminAccessError } = await import("@/lib/admin-rbac.server");
  const email = (context.claims as { email?: string })?.email ?? "";
  try {
    await requireAdminModule(context.supabase, context.userId, email, "integracoes");
    return { email };
  } catch (e) {
    if (e instanceof AdminAccessError) return { error: e.message };
    throw e;
  }
}

/** Fila de e-mails com números de acompanhamento. */
export const getEmailQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<EmailQueueResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;

    const { listEmailQueueRows, buildEmailQueueStats } = await import("@/lib/email-queue.server");
    const [rows, stats] = await Promise.all([
      listEmailQueueRows(data.status ?? "todos"),
      buildEmailQueueStats(),
    ]);
    return { rows, stats };
  });

/** Reenvia agora um e-mail da fila (auditado). */
export const retryEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Item inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;

    const { retryEmailItem } = await import("@/lib/email-queue.server");
    const result = await retryEmailItem(data.id);

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: access.email,
      action: "email.reenvio_manual",
      targetType: "email_queue",
      targetId: data.id,
      after: { ok: result.ok, error: result.error ?? null },
    });

    return result.ok ? { ok: true } : { error: result.error ?? "Falha no reenvio." };
  });

/** Descarta um e-mail da fila com motivo registrado. */
export const discardEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; reason: string }) => {
    if (!data?.id) throw new Error("Item inválido");
    if (!data.reason || data.reason.trim().length < 5) {
      throw new Error("Informe o motivo do descarte (mínimo 5 caracteres).");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;

    const { discardEmailItem } = await import("@/lib/email-queue.server");
    await discardEmailItem(data.id, data.reason.trim());

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: access.email,
      action: "email.descartado",
      targetType: "email_queue",
      targetId: data.id,
      reason: data.reason.trim(),
    });
    return { ok: true };
  });

/** Situação das rotinas automáticas (última execução, atrasos e falhas). */
export const getCronHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CronResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;
    const { buildCronHealth } = await import("@/lib/cron-monitor.server");
    return buildCronHealth();
  });

/** Processa a fila de e-mails agora, sem esperar o agendamento. */
export const flushEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActionResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;

    const { recordCronRun } = await import("@/lib/cron-monitor.server");
    const { flushEmailQueue } = await import("@/lib/email-queue.server");
    const run = await recordCronRun("email-queue", () => flushEmailQueue(25));
    return run.ok ? { ok: true } : { error: run.error };
  });
