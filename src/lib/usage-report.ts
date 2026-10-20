/** Validação pura do relato de "usuários em uso" (POST /api/public/usage). */
export const USAGE_MAX = 100_000;
export const USAGE_SKEW_MS = 10 * 60 * 1000;
export const USAGE_RATE_PER_MIN = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = new Set(["user_id", "usuarios_em_uso", "timestamp"]);

export type UsageReport = { user_id: string; usuarios_em_uso: number; timestamp: string; ts: number };

export function parseUsageReport(
  raw: unknown,
  now = Date.now(),
): { ok: true; value: UsageReport } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "corpo inválido" };
  const b = raw as Record<string, unknown>;
  for (const k of Object.keys(b)) if (!ALLOWED.has(k)) return { ok: false, error: `campo não aceito: ${k}` };
  if (typeof b.user_id !== "string" || !UUID_RE.test(b.user_id)) return { ok: false, error: "user_id inválido" };
  const n = b.usuarios_em_uso;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > USAGE_MAX)
    return { ok: false, error: "usuarios_em_uso inválido" };
  if (typeof b.timestamp !== "string") return { ok: false, error: "timestamp inválido" };
  const ts = Date.parse(b.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > USAGE_SKEW_MS) return { ok: false, error: "timestamp fora da janela" };
  return { ok: true, value: { user_id: b.user_id, usuarios_em_uso: n, timestamp: b.timestamp, ts } };
}

/** Última escrita vence: só grava se o timestamp for >= ao já guardado. */
export function shouldStore(incomingTs: number, storedTs: string | null | undefined): boolean {
  if (!storedTs) return true;
  const s = Date.parse(storedTs);
  return !Number.isFinite(s) || incomingTs >= s;
}
