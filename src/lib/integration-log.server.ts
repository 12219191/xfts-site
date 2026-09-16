/**
 * Registro das chamadas de integração (SSO, revalidação de acesso e
 * provisionamento). Nunca lança e nunca bloqueia a resposta ao sistema.
 */

export type IntegrationKind =
  | "sso_issue"
  | "sso_verify"
  | "entitlements"
  | "capability_check"
  | "provision"
  | "test";

export interface IntegrationEventInput {
  appKey: string;
  kind: IntegrationKind;
  status: "ok" | "denied" | "error";
  httpStatus?: number | null;
  /** Motivo curto e padronizado da recusa (nunca inclui token). */
  reason?: string | null;
  error?: string | null;
  userId?: string | null;
  durationMs?: number;
  environment?: string;
  detail?: Record<string, unknown>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Grava um evento de integração. Falhas de log são silenciosas por design. */
export async function logIntegrationEvent(input: IntegrationEventInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("integration_events").insert({
      app_key: input.appKey || "",
      kind: input.kind,
      status: input.status,
      http_status: input.httpStatus ?? null,
      reason: input.reason ?? null,
      error: input.error ? String(input.error).slice(0, 500) : null,
      user_id: input.userId && UUID_RE.test(input.userId) ? input.userId : null,
      duration_ms: Math.max(0, Math.round(input.durationMs ?? 0)),
      environment: input.environment ?? "live",
      detail: (input.detail ?? {}) as never,
    } as never);
  } catch {
    // observabilidade nunca derruba a operação principal
  }
}
