/**
 * Normalização de parâmetros de atribuição.
 * Evita variações do mesmo valor (maiúsculas, espaços, acentos, lixo de URL)
 * que fragmentariam os relatórios por utm_source / utm_campaign.
 */

const UTM_MAX = 160;
const CLICK_ID_MAX = 255;

/** utm_*: minúsculas, sem acentos, espaços viram "-", só [a-z0-9._-|/+]. */
export function normalizeUtmValue(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9.\-|/+]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, UTM_MAX);
  if (!cleaned) return undefined;
  // valores claramente inválidos vindos de templates de anúncio
  if (/^(null|undefined|none|n\/a|\{+.*\}+)$/.test(cleaned)) return undefined;
  return cleaned;
}

/** gclid/fbclid: preserva caixa, remove espaços e caracteres fora do padrão. */
export function normalizeClickId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.trim().replace(/[^A-Za-z0-9._\-]/g, "").slice(0, CLICK_ID_MAX);
  if (!cleaned) return undefined;
  if (/^(null|undefined)$/i.test(cleaned)) return undefined;
  return cleaned;
}

/** referrer / landing_page: apenas trim + limite (URLs precisam da forma original). */
export function normalizeUrlValue(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.trim().slice(0, CLICK_ID_MAX);
  return cleaned || undefined;
}
