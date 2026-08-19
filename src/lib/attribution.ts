export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
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
  lt_fbclid?: string;
  lt_referrer?: string;
  lt_landing_page?: string;
};

type StoredRecord = { data: Attribution; ts: number };

const FIRST_KEY = "xfts_attribution";
const LAST_KEY = "xfts_attribution_last";
const WINDOW_KEY = "xfts_attribution_window_days";
const DEFAULT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

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
    const value =
      key === "gclid" || key === "fbclid"
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

/** First-touch + last-touch (prefixado com `lt_`) para envio ao servidor. */
export function getAttributionPayload(): AttributionPayload {
  if (typeof window === "undefined") return {};
  const first = getAttribution();
  const last = getLastTouchAttribution();
  const payload: AttributionPayload = { ...first };
  for (const [key, value] of Object.entries(last)) {
    if (value) payload[`lt_${key}` as keyof AttributionPayload] = value;
  }
  return payload;
}
