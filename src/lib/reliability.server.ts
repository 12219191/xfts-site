/**
 * Confiabilidade das integrações: fila de provisionamento com nova tentativa
 * automática, saúde do SSO e limpeza de links expirados (server-only).
 */
import { getFlexusApp, FLEXUS_APPS } from "@/lib/flexus-apps";
import { appApiKey, signBody } from "@/lib/sso.server";
import type { ProvisionEvent } from "@/lib/provisioning.server";
import { logIntegrationEvent, type IntegrationKind } from "@/lib/integration-log.server";

/** Espera entre tentativas, em minutos (1min, 5min, 15min, 1h, 6h). */
export const PROVISION_BACKOFF_MINUTES = [1, 5, 15, 60, 360] as const;
export const PROVISION_MAX_ATTEMPTS = 6;

export interface ProvisionPayload {
  priceId: string | null;
  userId: string | null;
  event: ProvisionEvent;
  status: string | null;
  accessUntil: string | null;
  environment: string;
}

function nextAttemptAt(attempts: number): string {
  const idx = Math.min(Math.max(attempts - 1, 0), PROVISION_BACKOFF_MINUTES.length - 1);
  const minutes = PROVISION_BACKOFF_MINUTES[idx]!;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Registra a falha de um aviso ao sistema e agenda a nova tentativa. */
export async function enqueueProvision(
  appKey: string,
  payload: ProvisionPayload,
  error: string,
): Promise<void> {
  try {
    const supabase = await db();
    await supabase.from("provision_queue").insert({
      user_id: payload.userId,
      app_key: appKey,
      event: payload.event,
      price_id: payload.priceId,
      payload: payload as never,
      status: "pending",
      attempts: 1,
      last_error: error.slice(0, 500),
      next_attempt_at: nextAttemptAt(1),
      environment: payload.environment,
    } as never);
  } catch {
    // fila indisponível não pode derrubar o webhook de pagamento
  }
}

/** Marca como entregues eventuais pendências do mesmo cliente/sistema. */
export async function resolveProvisionQueue(appKey: string, userId: string | null) {
  if (!userId) return;
  try {
    const supabase = await db();
    await supabase
      .from("provision_queue")
      .update({ status: "delivered", delivered_at: new Date().toISOString() } as never)
      .eq("app_key", appKey)
      .eq("user_id", userId)
      .eq("status", "pending");
  } catch {
    /* silencioso */
  }
}

export interface RetryResult {
  processados: number;
  entregues: number;
  reagendados: number;
  esgotados: number;
}

/** Sweep da fila: reenvia os avisos pendentes que já venceram a espera. */
export async function retryProvisionQueue(limit = 25): Promise<RetryResult> {
  const supabase = await db();
  const { data } = await supabase
    .from("provision_queue")
    .select("id, app_key, attempts, payload")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    app_key: string;
    attempts: number;
    payload: ProvisionPayload;
  }>;
  const result: RetryResult = { processados: 0, entregues: 0, reagendados: 0, esgotados: 0 };

  const { provisionApp } = await import("@/lib/provisioning.server");

  for (const row of rows) {
    result.processados += 1;
    const attempts = row.attempts + 1;
    const outcome = await provisionApp({ ...row.payload, fromQueue: true });

    if (outcome.ok) {
      result.entregues += 1;
      await supabase
        .from("provision_queue")
        .update({
          status: "delivered",
          attempts,
          last_error: null,
          delivered_at: new Date().toISOString(),
        } as never)
        .eq("id", row.id);
      continue;
    }

    if (attempts >= PROVISION_MAX_ATTEMPTS) {
      result.esgotados += 1;
      await supabase
        .from("provision_queue")
        .update({
          status: "failed",
          attempts,
          last_error: (outcome.error ?? "falha").slice(0, 500),
        } as never)
        .eq("id", row.id);
      continue;
    }

    result.reagendados += 1;
    await supabase
      .from("provision_queue")
      .update({
        attempts,
        last_error: (outcome.error ?? "falha").slice(0, 500),
        next_attempt_at: nextAttemptAt(attempts),
      } as never)
      .eq("id", row.id);
  }

  return result;
}

/** Remove links de acesso único já expirados há mais de 7 dias. */
export async function cleanupExpiredSsoTokens(): Promise<number> {
  try {
    const supabase = await db();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("sso_tokens")
      .delete()
      .lt("expires_at", cutoff)
      .select("id");
    return (data ?? []).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------- saúde do SSO

export interface SsoAppHealth {
  key: string;
  name: string;
  available: boolean;
  keyConfigured: boolean;
  semaforo: "verde" | "amarelo" | "vermelho" | "cinza";
  acessos24h: number;
  recusas24h: number;
  erros24h: number;
  tempoMedioMs: number;
  ultimoSucessoAt: string | null;
  ultimaFalhaAt: string | null;
  motivos: Array<{ reason: string; total: number }>;
}

export interface SsoEventRow {
  id: string;
  app_key: string;
  kind: string;
  status: string;
  http_status: number | null;
  reason: string | null;
  error: string | null;
  user_id: string | null;
  duration_ms: number;
  environment: string;
  created_at: string;
}

export interface SsoHealthData {
  apps: SsoAppHealth[];
  eventos: SsoEventRow[];
  emails: Map<string, string> | undefined;
}

export async function buildSsoHealth(
  environment: string,
): Promise<{ apps: SsoAppHealth[]; eventos: Array<SsoEventRow & { email: string | null }> }> {
  const supabase = await db();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabase
    .from("integration_events")
    .select("app_key, kind, status, reason, duration_ms, created_at")
    .gte("created_at", since)
    .limit(5000);

  const { data: log } = await supabase
    .from("integration_events")
    .select(
      "id, app_key, kind, status, http_status, reason, error, user_id, duration_ms, environment, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(120);

  const { loadUserDirectory } = await import("@/lib/admin-directory.server");
  const directory = await loadUserDirectory();

  const apps: SsoAppHealth[] = FLEXUS_APPS.filter((a) => a.available).map((app) => {
    const rows = (recent ?? []).filter((r) => r.app_key === app.key);
    const ok = rows.filter((r) => r.status === "ok");
    const denied = rows.filter((r) => r.status === "denied");
    const errored = rows.filter((r) => r.status === "error");
    const motivos = new Map<string, number>();
    for (const r of [...denied, ...errored]) {
      const key = r.reason ?? "erro";
      motivos.set(key, (motivos.get(key) ?? 0) + 1);
    }
    const durations = rows.map((r) => r.duration_ms ?? 0).filter((d) => d > 0);
    const maxAt = (list: Array<{ created_at: string }>) =>
      list.reduce<string | null>((acc, r) => (!acc || r.created_at > acc ? r.created_at : acc), null);
    const lastOk = maxAt(ok);
    // Só erros reais contam como falha do sistema; recusas ("sem assinatura")
    // são resposta correta do hub, não indisponibilidade.
    const lastError = maxAt(errored);
    const lastFail = maxAt([...denied, ...errored]);

    const keyConfigured = !!appApiKey(app.key);
    // Semáforo por recência: uma falha já recuperada não pinta o sistema de
    // vermelho — vira amarelo com a hora da recuperação.
    let semaforo: SsoAppHealth["semaforo"] = "cinza";
    let recuperadoEm: string | null = null;
    if (!keyConfigured) semaforo = "vermelho";
    else if (lastError && (!lastOk || lastError > lastOk)) semaforo = "vermelho";
    else if (lastError) {
      semaforo = "amarelo";
      recuperadoEm = lastOk;
    } else if (denied.length > 0 && ok.length === 0) semaforo = "amarelo";
    else if (ok.length > 0) semaforo = "verde";

    return {
      key: app.key,
      name: app.name,
      available: app.available,
      keyConfigured,
      semaforo,
      acessos24h: ok.length,
      recusas24h: denied.length,
      erros24h: errored.length,
      tempoMedioMs: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      ultimoSucessoAt: lastOk,
      ultimaFalhaAt: lastFail,
      ultimoErroAt: lastError,
      recuperadoEm,
      motivos: [...motivos.entries()]
        .map(([reason, total]) => ({ reason, total }))
        .sort((a, b) => b.total - a.total),
    };
  });

  const eventos = ((log ?? []) as SsoEventRow[])
    .filter((e) => environment === "todos" || e.environment === environment)
    .map((e) => ({
      ...e,
      email: e.user_id ? directory.get(e.user_id)?.email ?? null : null,
    }));

  return { apps, eventos };
}

export interface ProvisionQueueRow {
  id: string;
  user_id: string | null;
  email: string | null;
  app_key: string;
  appName: string;
  event: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  environment: string;
  created_at: string;
}

export async function listProvisionQueueRows(
  status: string,
  limit = 100,
): Promise<ProvisionQueueRow[]> {
  const supabase = await db();
  let query = supabase
    .from("provision_queue")
    .select(
      "id, user_id, app_key, event, status, attempts, last_error, next_attempt_at, environment, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "todos") query = query.eq("status", status);
  const { data } = await query;

  const { loadUserDirectory } = await import("@/lib/admin-directory.server");
  const directory = await loadUserDirectory();

  return ((data ?? []) as Array<Omit<ProvisionQueueRow, "email" | "appName">>).map((r) => ({
    ...r,
    email: r.user_id ? directory.get(r.user_id)?.email ?? null : null,
    appName: getFlexusApp(r.app_key)?.name ?? r.app_key,
  }));
}

/** Reenvia agora um item da fila (ação manual do admin). */
export async function retryProvisionItem(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await db();
  const { data } = await supabase
    .from("provision_queue")
    .select("id, attempts, payload")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Item não encontrado." };

  const row = data as unknown as { attempts: number; payload: ProvisionPayload };
  const { provisionApp } = await import("@/lib/provisioning.server");
  const outcome = await provisionApp({ ...row.payload, fromQueue: true });
  const attempts = row.attempts + 1;

  if (outcome.ok) {
    await supabase
      .from("provision_queue")
      .update({
        status: "delivered",
        attempts,
        last_error: null,
        delivered_at: new Date().toISOString(),
      } as never)
      .eq("id", id);
    return { ok: true };
  }

  await supabase
    .from("provision_queue")
    .update({
      status: attempts >= PROVISION_MAX_ATTEMPTS ? "failed" : "pending",
      attempts,
      last_error: (outcome.error ?? "falha").slice(0, 500),
      next_attempt_at: nextAttemptAt(attempts),
    } as never)
    .eq("id", id);
  return { ok: false, error: outcome.error ?? "Falha no reenvio." };
}

/** Descarta um item da fila (ação manual, auditada pelo chamador). */
export async function discardProvisionItem(id: string): Promise<{ ok: boolean }> {
  const supabase = await db();
  await supabase
    .from("provision_queue")
    .update({ status: "discarded" } as never)
    .eq("id", id);
  return { ok: true };
}

export interface ConnectionTestResult {
  app: string;
  ok: boolean;
  /** ok = tudo certo; parcial = chave aceita mas ping não tratado; erro = falha real. */
  nivel: "ok" | "parcial" | "erro";
  httpStatus: number | null;
  durationMs: number;
  detalhe: string;
}

/** Teste de ponta a ponta do endpoint de provisionamento do sistema. */
export async function testAppConnection(appKey: string): Promise<ConnectionTestResult> {
  const app = getFlexusApp(appKey);
  const started = Date.now();
  const finish = async (
    nivel: "ok" | "parcial" | "erro",
    detalhe: string,
    httpStatus: number | null = null,
  ): Promise<ConnectionTestResult> => {
    const durationMs = Date.now() - started;
    await logIntegrationEvent({
      appKey,
      kind: "test" as IntegrationKind,
      status: nivel === "ok" ? "ok" : nivel === "parcial" ? "denied" : "error",
      httpStatus,
      reason: nivel === "ok" ? undefined : detalhe,
      durationMs,
    });
    return { app: appKey, ok: nivel === "ok", nivel, httpStatus, durationMs, detalhe };
  };

  if (!app || !app.available || !app.url) return finish("erro", "Sistema indisponível ou sem domínio.");
  const secret = appApiKey(app.key);
  if (!secret) return finish("erro", "Chave de API não configurada para este sistema.");

  const body = JSON.stringify({
    event: "ping",
    dry_run: true,
    produto: appKey,
    user_id: "00000000-0000-0000-0000-000000000000",
    email: "teste-integracao@xfts.com.br",
    plano: "teste",
    limite_usuarios: 1,
    status: "ping",
    timestamp: new Date().toISOString(),
  });

  try {
    const signature = await signBody(secret, body);
    const endpoint = app.provisionUrl ?? `${app.url}/api/provision`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-flexus-signature": signature },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = res.headers.get("content-type") ?? "";
    const raw = (await res.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 200);
    const trecho = raw ? ` — ${raw}` : "";

    if (res.status === 401 || res.status === 403) {
      return finish(
        "erro",
        `Chave recusada (HTTP ${res.status})${trecho} — confira se a chave compartilhada é idêntica nos dois projetos.`,
        res.status,
      );
    }
    if (!res.ok) {
      const naoTrataPing = res.status === 400 || res.status === 404 || res.status === 422;
      return finish(
        naoTrataPing ? "parcial" : "erro",
        naoTrataPing
          ? `Endpoint alcançado e chave aceita, mas o sistema ainda não trata o evento de teste (HTTP ${res.status})${trecho}.`
          : `O sistema respondeu HTTP ${res.status}${trecho}.`,
        res.status,
      );
    }
    if (!contentType.includes("application/json")) {
      return finish("parcial", `O endpoint respondeu, mas não em formato JSON${trecho}.`, res.status);
    }
    return finish("ok", "Conexão saudável: chave aceita e resposta válida.", res.status);
  } catch (e) {
    return finish("erro", e instanceof Error ? e.message : "Falha de rede.");
  }
}


// -------------------------------------------------------------------- alertas

export interface OperationalAlerts {
  webhooksFalhos24h: number;
  provisionamentosEsgotados: number;
  sistemasComProblema: string[];
  emailsPresos: number;
  emailsEsgotados: number;
  rotinasAtrasadas: string[];
  rotinasComFalha: string[];
}

export async function buildOperationalAlerts(): Promise<OperationalAlerts> {
  const supabase = await db();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { buildEmailQueueStats } = await import("@/lib/email-queue.server");
  const { buildCronHealth } = await import("@/lib/cron-monitor.server");

  const [{ data: webhooks }, { data: queue }, { apps }, emails, cron] = await Promise.all([
    supabase
      .from("webhook_events")
      .select("id")
      .eq("status", "failed")
      .gte("created_at", since)
      .limit(500),
    supabase.from("provision_queue").select("id").eq("status", "failed").limit(500),
    buildSsoHealth("todos"),
    buildEmailQueueStats(),
    buildCronHealth(),
  ]);

  return {
    webhooksFalhos24h: (webhooks ?? []).length,
    provisionamentosEsgotados: (queue ?? []).length,
    sistemasComProblema: apps.filter((a) => a.semaforo === "vermelho").map((a) => a.name),
    emailsPresos: emails.presos,
    emailsEsgotados: emails.esgotados,
    rotinasAtrasadas: cron.jobs.filter((j) => j.atrasada).map((j) => j.name),
    rotinasComFalha: cron.jobs.filter((j) => j.ultimaOk === false).map((j) => j.name),
  };
}

/** Resumo diário por e-mail para a equipe interna (no máximo 1 por dia). */
export async function sendDailyOperationalDigest(): Promise<{ sent: boolean }> {
  const supabase = await db();
  const alerts = await buildOperationalAlerts();
  const hasIssue =
    alerts.webhooksFalhos24h > 0 ||
    alerts.provisionamentosEsgotados > 0 ||
    alerts.sistemasComProblema.length > 0 ||
    alerts.emailsPresos > 0 ||
    alerts.emailsEsgotados > 0 ||
    alerts.rotinasAtrasadas.length > 0 ||
    alerts.rotinasComFalha.length > 0;
  if (!hasIssue) return { sent: false };

  const today = new Date().toISOString().slice(0, 10);
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ops_digest")
    .maybeSingle();
  const value = ((setting?.value ?? {}) as { last_sent?: string; recipients?: string[] }) || {};
  if (value.last_sent === today) return { sent: false };

  const recipients = value.recipients?.length ? value.recipients : ["xfts@xfts.com.br"];

  try {
    // O alerta interno também passa pela fila: se o e-mail falhar agora,
    // ele é reenviado automaticamente na próxima varredura.
    const { enqueueEmail } = await import("@/lib/email-queue.server");
    for (const to of recipients) {
      await enqueueEmail({
        template: "alerta-operacional",
        recipient: to,
        idempotencyKey: `ops-digest-${today}-${to}`,
        templateData: {
          data: new Date().toLocaleDateString("pt-BR"),
          webhooks: alerts.webhooksFalhos24h,
          provisionamentos: alerts.provisionamentosEsgotados,
          sistemas: alerts.sistemasComProblema,
          emails: alerts.emailsPresos + alerts.emailsEsgotados,
          rotinas: [...alerts.rotinasAtrasadas, ...alerts.rotinasComFalha],
        },
      });
    }
  } catch {
    return { sent: false };
  }


  await supabase
    .from("app_settings")
    .upsert({ key: "ops_digest", value: { ...value, last_sent: today } as never } as never, {
      onConflict: "key",
    });
  return { sent: true };
}
