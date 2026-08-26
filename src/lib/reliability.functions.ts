import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  ConnectionTestResult,
  ProvisionQueueRow,
  SsoAppHealth,
  SsoEventRow,
} from "@/lib/reliability.server";

type SsoHealthResult =
  | { apps: SsoAppHealth[]; eventos: Array<SsoEventRow & { email: string | null }> }
  | { error: string };
type QueueResult = { rows: ProvisionQueueRow[] } | { error: string };
type ActionResult = { ok: true } | { error: string };
type TestResult = { result: ConnectionTestResult } | { error: string };

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

/** Saúde do SSO: semáforo por sistema e log das últimas chamadas. */
export const getSsoHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<SsoHealthResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;
    const { buildSsoHealth } = await import("@/lib/reliability.server");
    return buildSsoHealth(data.environment ?? "todos");
  });

/** Fila de provisionamento (avisos enviados aos sistemas FLEXUS). */
export const getProvisionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<QueueResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;
    const { listProvisionQueueRows } = await import("@/lib/reliability.server");
    return { rows: await listProvisionQueueRows(data.status ?? "todos") };
  });

/** Reenvia agora um aviso pendente (auditado). */
export const retryProvision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Item inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;

    const { retryProvisionItem } = await import("@/lib/reliability.server");
    const result = await retryProvisionItem(data.id);

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: access.email,
      action: "provisionamento.reenvio_manual",
      targetType: "provision_queue",
      targetId: data.id,
      after: { ok: result.ok, error: result.error ?? null },
    });

    return result.ok ? { ok: true } : { error: result.error ?? "Falha no reenvio." };
  });

/** Descarta um aviso da fila (auditado). */
export const discardProvision = createServerFn({ method: "POST" })
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

    const { discardProvisionItem } = await import("@/lib/reliability.server");
    await discardProvisionItem(data.id);

    const { recordAudit } = await import("@/lib/admin-audit.server");
    await recordAudit({
      actorId: context.userId,
      actorEmail: access.email,
      action: "provisionamento.descartado",
      targetType: "provision_queue",
      targetId: data.id,
      reason: data.reason.trim(),
    });
    return { ok: true };
  });

/** Testa a conexão com o sistema FLEXUS de ponta a ponta. */
export const testFlexusConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { app: string }) => {
    if (!/^[a-z0-9]+$/.test(data?.app ?? "")) throw new Error("Sistema inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<TestResult> => {
    const access = await guard(context as never);
    if ("error" in access) return access;
    const { testAppConnection } = await import("@/lib/reliability.server");
    return { result: await testAppConnection(data.app) };
  });

/** Reprocessa um evento do Stripe pelo identificador (apenas superadmin). */
export const reprocessWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventId: string; environment: "sandbox" | "live" }) => {
    if (!data?.eventId?.startsWith("evt_")) throw new Error("Identificador de evento inválido");
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Ambiente inválido");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<ActionResult> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { loadAdminRoles } = await import("@/lib/admin-rbac.server");
    const roles = await loadAdminRoles(context.supabase, context.userId);
    if (!roles.includes("superadmin")) {
      return { error: "Apenas Superadmin pode reprocessar eventos." };
    }

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const event = await stripe.events.retrieve(data.eventId);

      const { handleStripeEvent, logWebhookEvent, eventSummary } = await import(
        "@/lib/payments-webhook.server"
      );
      const started = Date.now();
      await handleStripeEvent(event as never, data.environment);
      await logWebhookEvent({
        stripe_event_id: `${data.eventId}:reprocess:${Date.now()}`,
        event_type: (event as { type: string }).type,
        environment: data.environment,
        status: "processed",
        duration_ms: Date.now() - started,
        summary: eventSummary(event as never),
      });

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString() } as never)
        .eq("stripe_event_id", data.eventId);

      const { recordAudit } = await import("@/lib/admin-audit.server");
      await recordAudit({
        actorId: context.userId,
        actorEmail: email,
        action: "webhook.reprocessado",
        targetType: "webhook_event",
        targetId: data.eventId,
        after: { type: (event as { type: string }).type, environment: data.environment },
      });

      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Falha ao reprocessar o evento." };
    }
  });
