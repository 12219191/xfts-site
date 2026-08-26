/**
 * Monitor das rotinas automáticas (server-only).
 *
 * Cada rotina agendada registra sua execução em `cron_runs`, permitindo ver no
 * painel quando rodou pela última vez, quanto tempo levou, se deu certo e se
 * está atrasada.
 */

/** Valor simples que pode ir e voltar do banco sem perder informação. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type CronJobKey = "reliability" | "dunning" | "email-queue" | "crm-retry";

export interface CronJobDefinition {
  key: CronJobKey;
  name: string;
  description: string;
  /** Intervalo esperado em minutos; usado para detectar atraso. */
  everyMinutes: number;
}

export const CRON_JOBS: CronJobDefinition[] = [
  {
    key: "reliability",
    name: "Confiabilidade",
    description: "Reenvia avisos aos sistemas FLEXUS, limpa links expirados e checa alertas.",
    everyMinutes: 5,
  },
  {
    key: "email-queue",
    name: "Fila de e-mails",
    description: "Tenta novamente os e-mails que falharam no primeiro envio.",
    everyMinutes: 5,
  },
  {
    key: "dunning",
    name: "Cobrança",
    description: "Avança a régua de cobrança (D+1, D+3, D+5) e bloqueia ao fim da carência.",
    everyMinutes: 60,
  },
  {
    key: "crm-retry",
    name: "Leads para o CRM",
    description: "Reenvia ao FLEXUS | CRM os leads que não foram aceitos na primeira tentativa.",
    everyMinutes: 10,
  },
];

/** Tolerância antes de considerar uma rotina atrasada. */
export const LATE_FACTOR = 4;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Executa a rotina registrando início, fim, duração e resultado.
 * A falha de registro nunca impede a rotina de rodar.
 */
export async function recordCronRun<T>(
  job: CronJobKey,
  run: () => Promise<T>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const startedAt = new Date();
  let outcome: { ok: true; result: T } | { ok: false; error: string };

  try {
    outcome = { ok: true, result: await run() };
  } catch (e) {
    outcome = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const finishedAt = new Date();
    const supabase = await db();
    await supabase.from("cron_runs").insert({
      job,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      ok: outcome.ok,
      result: (outcome.ok ? (outcome.result as never) : {}) as never,
      error: outcome.ok ? null : outcome.error.slice(0, 500),
    } as never);
  } catch {
    // registro indisponível não pode derrubar a rotina
  }

  return outcome;
}

export interface CronRunRow {
  id: string;
  job: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number;
  ok: boolean;
  result: Record<string, Json>;
  error: string | null;
}

export interface CronJobHealth extends CronJobDefinition {
  ultimaExecucao: string | null;
  ultimaOk: boolean | null;
  ultimoErro: string | null;
  duracaoMs: number | null;
  execucoes7d: number;
  falhas7d: number;
  atrasada: boolean;
  nuncaExecutou: boolean;
}

export interface CronHealth {
  jobs: CronJobHealth[];
  execucoes: CronRunRow[];
}

/** Saúde das rotinas: última execução, atraso e taxa de falha. */
export async function buildCronHealth(): Promise<CronHealth> {
  const supabase = await db();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("cron_runs")
    .select("*")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as unknown as CronRunRow[];
  const now = Date.now();

  const jobs = CRON_JOBS.map<CronJobHealth>((job) => {
    const mine = rows.filter((r) => r.job === job.key);
    const last = mine[0] ?? null;
    const lastMs = last ? new Date(last.started_at).getTime() : null;
    const atrasada =
      lastMs != null && now - lastMs > job.everyMinutes * LATE_FACTOR * 60_000;

    return {
      ...job,
      ultimaExecucao: last?.started_at ?? null,
      ultimaOk: last ? last.ok : null,
      ultimoErro: last?.error ?? null,
      duracaoMs: last?.duration_ms ?? null,
      execucoes7d: mine.length,
      falhas7d: mine.filter((r) => !r.ok).length,
      atrasada,
      nuncaExecutou: !last,
    };
  });

  return { jobs, execucoes: rows.slice(0, 60) };
}
