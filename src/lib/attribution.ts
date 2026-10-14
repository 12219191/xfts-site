import {
  normalizeClickId,
  normalizeUrlValue,
  normalizeUtmValue,
} from "@/lib/utm-normalize";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  /** Cliques do Google em iOS (sem gclid): app → gbraid, web → wbraid. */
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  /** Identificador de clique do LinkedIn (URL ou cookie do Insight Tag). */
  li_fat_id?: string;
  referrer?: string;
  landing_page?: string;
};

export type AttributionPayload = Attribution & {
  lt_utm_source?: string;
  lt_utm_medium?: string;
  lt_utm_campaign?: string;
  lt_utm_term?: string;
  lt_utm_content?: string;
  lt_gclid?: string;
  lt_gbraid?: string;
  lt_wbraid?: string;
  lt_fbclid?: string;
  lt_li_fat_id?: string;
  lt_referrer?: string;
  lt_landing_page?: string;
  /** Cookies da Meta lidos no momento do envio (mudam a cada visita). */
  fbc?: string;
  fbp?: string;
};

type StoredRecord = { data: Attribution; ts: number };

const FIRST_KEY = "xfts_attribution";
const LAST_KEY = "xfts_attribution_last";
const WINDOW_KEY = "xfts_attribution_window_days";
const DEFAULT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** IDs de clique dos anúncios: preservam a caixa original e não são normalizados como UTM. */
const CLICK_ID_KEYS = ["gclid", "gbraid", "wbraid", "fbclid", "li_fat_id"] as const;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  ...CLICK_ID_KEYS,
] as const;

const isClickIdKey = (key: string): boolean =>
  (CLICK_ID_KEYS as readonly string[]).includes(key);

/** Janela de atribuição configurada no admin (cacheada no navegador). */
export function getAttributionWindowDays(): number {
  if (typeof window === "undefined") return DEFAULT_WINDOW_DAYS;
  try {
    const raw = localStorage.getItem(WINDOW_KEY);
    const days = raw ? Number(raw) : NaN;
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_WINDOW_DAYS;
  } catch {
    return DEFAULT_WINDOW_DAYS;
  }
}

export function setAttributionWindowDays(days: number) {
  if (typeof window === "undefined" || !Number.isFinite(days) || days <= 0) return;
  try {
    localStorage.setItem(WINDOW_KEY, String(Math.round(days)));
  } catch {
    /* storage indisponível */
  }
}

function parseRecord(raw: string): StoredRecord | null {
  try {
    const parsed = JSON.parse(raw) as StoredRecord | Attribution;
    if (parsed && typeof parsed === "object" && "data" in parsed && "ts" in parsed) {
      return parsed as StoredRecord;
    }
    // Formato antigo (sem timestamp): trata como capturado agora.
    return { data: parsed as Attribution, ts: Date.now() };
  } catch {
    return null;
  }
}

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
}

function writeCookie(key: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${Math.round(
      maxAgeSeconds
    )}; SameSite=Lax${secure}`;
  } catch {
    /* cookies indisponíveis */
  }
}

/** localStorage é a fonte primária; cookie serve de fallback (e vice-versa). */
function readStored(key: string): StoredRecord | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const fromStorage = raw ? parseRecord(raw) : null;
  if (fromStorage) return fromStorage;

  const cookieRaw = readCookie(key);
  if (!cookieRaw) return null;
  const fromCookie = parseRecord(cookieRaw);
  if (fromCookie) {
    // Reidrata o localStorage a partir do cookie.
    try {
      localStorage.setItem(key, JSON.stringify(fromCookie));
    } catch {
      /* storage indisponível */
    }
  }
  return fromCookie;
}

/** Retorna o registro apenas se ainda estiver dentro da janela de atribuição. */
function readValid(key: string): StoredRecord | null {
  const record = readStored(key);
  if (!record) return null;
  const maxAge = getAttributionWindowDays() * DAY_MS;
  if (Date.now() - record.ts > maxAge) return null;
  return record;
}

function write(key: string, data: Attribution) {
  const serialized = JSON.stringify({ data, ts: Date.now() } satisfies StoredRecord);
  try {
    localStorage.setItem(key, serialized);
  } catch {
    /* storage indisponível (modo privado) */
  }
  writeCookie(key, serialized, getAttributionWindowDays() * 24 * 60 * 60);
}


function readCurrent(): { data: Attribution; hasSignal: boolean } {
  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};
  let hasSignal = false;

  for (const key of UTM_KEYS) {
    const raw = params.get(key);
    const value = isClickIdKey(key)
      ? normalizeClickId(raw)
      : normalizeUtmValue(raw);
    if (value) {
      data[key] = value;
      hasSignal = true;
    }
  }

  const ref = typeof document === "undefined" ? "" : document.referrer;
  if (ref && !ref.startsWith(window.location.origin)) {
    data.referrer = normalizeUrlValue(ref);
    hasSignal = true;
  }

  data.landing_page = normalizeUrlValue(
    `${window.location.pathname}${window.location.search}`
  );
  return { data, hasSignal };
}

/**
 * Captura a atribuição de primeira visita (first-touch) e atualiza a
 * atribuição mais recente (last-touch) sempre que há novo sinal de origem.
 * Registros fora da janela configurada expiram e são recapturados.
 * Deve ser chamada apenas no navegador (useEffect / handler).
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const { data, hasSignal } = readCurrent();
  const first = readValid(FIRST_KEY);

  if (!first) write(FIRST_KEY, data);
  if (hasSignal || !readValid(LAST_KEY)) write(LAST_KEY, data);

  return first?.data ?? data;
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readValid(FIRST_KEY)?.data ?? captureAttribution();
}

export function getLastTouchAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readValid(LAST_KEY)?.data ?? getAttribution();
}

/**
 * fbc no formato da Meta (`fb.<índice>.<ms do clique>.<fbclid>`). O pixel grava o cookie
 * `_fbc` sozinho; isto só cobre o caso em que ele ainda não gravou (pixel bloqueado ou
 * formulário enviado logo na chegada).
 */
export function buildFbc(fbclid: string | undefined, clickedAtMs: number): string | undefined {
  return fbclid ? `fb.1.${Math.round(clickedAtMs)}.${fbclid}` : undefined;
}

function readAdCookie(key: string): string | undefined {
  try {
    return normalizeClickId(readCookie(key));
  } catch {
    return undefined; // cookie com percent-encoding inválido
  }
}

/**
 * Cookies de anúncio lidos na hora do envio, porque mudam a cada visita:
 * `_fbc`/`_fbp` (pixel da Meta) e `li_fat_id` (Insight Tag do LinkedIn).
 */
export function getAdCookies(opts?: { fbclid?: string; clickedAtMs?: number }): {
  fbc?: string;
  fbp?: string;
  li_fat_id?: string;
} {
  const out: { fbc?: string; fbp?: string; li_fat_id?: string } = {};
  const fbc = readAdCookie("_fbc") ?? buildFbc(opts?.fbclid, opts?.clickedAtMs ?? Date.now());
  const fbp = readAdCookie("_fbp");
  const li = readAdCookie("li_fat_id");
  if (fbc) out.fbc = fbc;
  if (fbp) out.fbp = fbp;
  if (li) out.li_fat_id = li;
  return out;
}

/** First-touch + last-touch (prefixado com `lt_`) para envio ao servidor. */
export function getAttributionPayload(): AttributionPayload {
  if (typeof window === "undefined") return {};
  const first = getAttribution();
  const last = getLastTouchAttribution();
  const payload: AttributionPayload = { ...first };
  for (const [key, value] of Object.entries(last)) {
    if (value) payload[`lt_${key}` as keyof AttributionPayload] = value;
  }

  // Cookies de anúncio (lidos agora). O fbclid mais recente é o do clique que gerou o fbc.
  const fbclid = last.fbclid ?? first.fbclid;
  const clickedAtMs =
    (last.fbclid ? readValid(LAST_KEY)?.ts : readValid(FIRST_KEY)?.ts) ?? Date.now();
  const cookies = getAdCookies({ fbclid, clickedAtMs });
  if (cookies.fbc) payload.fbc = cookies.fbc;
  if (cookies.fbp) payload.fbp = cookies.fbp;
  if (cookies.li_fat_id) {
    // Sem li_fat_id na URL, o cookie do Insight Tag é o melhor sinal que existe.
    if (!payload.li_fat_id) payload.li_fat_id = cookies.li_fat_id;
    if (!payload.lt_li_fat_id) payload.lt_li_fat_id = cookies.li_fat_id;
  }
  return payload;
}
