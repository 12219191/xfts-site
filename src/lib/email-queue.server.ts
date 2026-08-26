/**
 * Fila de e-mails com nova tentativa automática (server-only).
 *
 * Todo e-mail transacional ou de alerta interno passa por aqui: o registro é
 * criado com uma chave de idempotência (nunca envia o mesmo aviso duas vezes),
 * o envio é tentado na hora e, se falhar, a fila tenta de novo com espera
 * crescente até esgotar as tentativas.
 */

/** Espera entre tentativas, em minutos (1min, 5min, 15min, 1h, 6h). */
export const EMAIL_BACKOFF_MINUTES = [1, 5, 15, 60, 360] as const;
export const EMAIL_MAX_ATTEMPTS = 6;

/** Valor simples que pode ir e voltar do banco sem perder informação. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type EmailQueueStatus =
  | "pending"
  | "sent"
  | "suppressed"
  | "failed"
  | "discarded";

export interface EmailQueueRow {
  id: string;
  template: string;
  recipient: string;
  template_data: Record<string, Json>;
  idempotency_key: string;
  reply_to: string | null;
  status: EmailQueueStatus;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  sent_at: string | null;
  discard_reason: string | null;
  environment: string;
  created_at: string;
}

export interface EnqueueEmailArgs {
  template: string;
  recipient: string;
  idempotencyKey: string;
  templateData?: Record<string, Json>;
  replyTo?: string | null;
  environment?: string;
  /** Tenta enviar imediatamente (padrão) ou deixa para a fila. */
  sendNow?: boolean;
}

export interface EnqueueEmailResult {
  status: EmailQueueStatus;
  /** true quando o mesmo aviso já existia na fila (nada foi reenviado). */
  duplicate: boolean;
  error?: string;
}

function nextAttemptAt(attempts: number): string {
  const idx = Math.min(Math.max(attempts - 1, 0), EMAIL_BACKOFF_MINUTES.length - 1);
  return new Date(Date.now() + EMAIL_BACKOFF_MINUTES[idx]! * 60_000).toISOString();
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Envia um item e atualiza a fila conforme o resultado. */
async function attemptSend(row: EmailQueueRow): Promise<EmailQueueStatus> {
  const supabase = await db();
  const attempts = (row.attempts ?? 0) + 1;

  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail(row.template, row.recipient, {
      idempotencyKey: row.idempotency_key,
      templateData: (row.template_data ?? {}) as Record<string, unknown>,
      ...(row.reply_to ? { replyTo: row.reply_to } : {}),
    });

    const status: EmailQueueStatus = result.sent ? "sent" : "suppressed";
    await supabase
      .from("email_queue")
      .update({
        status,
        attempts,
        last_error: null,
        sent_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);
    return status;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const esgotou = attempts >= EMAIL_MAX_ATTEMPTS;
    await supabase
      .from("email_queue")
      .update({
        status: esgotou ? "failed" : "pending",
        attempts,
        last_error: message.slice(0, 500),
        next_attempt_at: nextAttemptAt(attempts),
      } as never)
      .eq("id", row.id);
    return esgotou ? "failed" : "pending";
  }
}

/**
 * Coloca um e-mail na fila (idempotente) e tenta enviar na hora.
 * Um segundo pedido com a mesma chave não gera novo envio.
 */
export async function enqueueEmail(args: EnqueueEmailArgs): Promise<EnqueueEmailResult> {
  const supabase = await db();

  const { data: existing } = await supabase
    .from("email_queue")
    .select("id, status")
    .eq("idempotency_key", args.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { status: (existing as { status: EmailQueueStatus }).status, duplicate: true };
  }

  const { data: inserted, error } = await supabase
    .from("email_queue")
    .insert({
      template: args.template,
      recipient: args.recipient,
      template_data: (args.templateData ?? {}) as never,
      idempotency_key: args.idempotencyKey,
      reply_to: args.replyTo ?? null,
      status: "pending",
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      environment: args.environment ?? "sandbox",
    } as never)
    .select("*")
    .maybeSingle();

  if (error || !inserted) {
    // Corrida entre dois processos com a mesma chave: o outro já enfileirou.
    return { status: "pending", duplicate: true, error: error?.message };
  }

  if (args.sendNow === false) return { status: "pending", duplicate: false };

  const status = await attemptSend(inserted as unknown as EmailQueueRow);
  return { status, duplicate: false };
}

export interface FlushResult {
  processados: number;
  enviados: number;
  suprimidos: number;
  reagendados: number;
  esgotados: number;
}

/** Processa os e-mails pendentes cuja espera venceu. */
export async function flushEmailQueue(limit = 25): Promise<FlushResult> {
  const supabase = await db();
  const { data } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as unknown as EmailQueueRow[];
  const result: FlushResult = {
    processados: rows.length,
    enviados: 0,
    suprimidos: 0,
    reagendados: 0,
    esgotados: 0,
  };

  for (const row of rows) {
    const status = await attemptSend(row);
    if (status === "sent") result.enviados += 1;
    else if (status === "suppressed") result.suprimidos += 1;
    else if (status === "failed") result.esgotados += 1;
    else result.reagendados += 1;
  }

  return result;
}

/** Lista a fila para o painel administrativo. */
export async function listEmailQueueRows(status = "todos", limit = 100): Promise<EmailQueueRow[]> {
  const supabase = await db();
  let query = supabase
    .from("email_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "todos") query = query.eq("status", status);
  const { data } = await query;
  return (data ?? []) as unknown as EmailQueueRow[];
}

/** Reenvia agora um item da fila, ignorando a espera. */
export async function retryEmailItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await db();
  const { data } = await supabase.from("email_queue").select("*").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Item não encontrado" };

  const row = data as unknown as EmailQueueRow;
  const status = await attemptSend(row);
  if (status === "sent" || status === "suppressed") return { ok: true };
  const { data: after } = await supabase
    .from("email_queue")
    .select("last_error")
    .eq("id", id)
    .maybeSingle();
  return { ok: false, error: (after as { last_error?: string } | null)?.last_error ?? "Falha no envio" };
}

/** Descarta um item da fila com motivo registrado. */
export async function discardEmailItem(id: string, reason: string): Promise<{ ok: boolean }> {
  const supabase = await db();
  await supabase
    .from("email_queue")
    .update({
      status: "discarded",
      discard_reason: reason.slice(0, 300),
    } as never)
    .eq("id", id);
  return { ok: true };
}

export interface EmailQueueStats {
  pendentes: number;
  presos: number;
  esgotados: number;
  enviados24h: number;
}

/** Números da fila para alertas e para o painel. */
export async function buildEmailQueueStats(): Promise<EmailQueueStats> {
  const supabase = await db();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stuckBefore = new Date(Date.now() - 30 * 60_000).toISOString();

  const [{ data: pendentes }, { data: esgotados }, { data: enviados }] = await Promise.all([
    supabase.from("email_queue").select("created_at").eq("status", "pending").limit(500),
    supabase.from("email_queue").select("id").eq("status", "failed").limit(500),
    supabase.from("email_queue").select("id").eq("status", "sent").gte("sent_at", since).limit(1000),
  ]);

  const pendingRows = (pendentes ?? []) as Array<{ created_at: string }>;
  return {
    pendentes: pendingRows.length,
    presos: pendingRows.filter((r) => r.created_at <= stuckBefore).length,
    esgotados: (esgotados ?? []).length,
    enviados24h: (enviados ?? []).length,
  };
}
