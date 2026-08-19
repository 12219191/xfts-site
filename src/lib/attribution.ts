export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
};

export type AttributionPayload = Attribution & {
  lt_utm_source?: string;
  lt_utm_medium?: string;
  lt_utm_campaign?: string;
  lt_utm_term?: string;
  lt_utm_content?: string;
  lt_referrer?: string;
  lt_landing_page?: string;
};

const FIRST_KEY = "xfts_attribution";
const LAST_KEY = "xfts_attribution_last";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

function readStored(key: string): Attribution | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: Attribution) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sessionStorage indisponível (modo privado) */
  }
}

function readCurrent(): { data: Attribution; hasSignal: boolean } {
  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};
  let hasSignal = false;

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      data[key] = value.slice(0, 160);
      hasSignal = true;
    }
  }

  const ref = typeof document === "undefined" ? "" : document.referrer;
  if (ref && !ref.startsWith(window.location.origin)) {
    data.referrer = ref.slice(0, 255);
    hasSignal = true;
  }

  data.landing_page = `${window.location.pathname}${window.location.search}`.slice(0, 255);
  return { data, hasSignal };
}

/**
 * Captura a atribuição de primeira visita (first-touch) e atualiza a
 * atribuição mais recente (last-touch) sempre que há novo sinal de origem.
 * Deve ser chamada apenas no navegador (useEffect / handler).
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const { data, hasSignal } = readCurrent();
  const first = readStored(FIRST_KEY);

  if (!first) write(FIRST_KEY, data);
  if (hasSignal || !readStored(LAST_KEY)) write(LAST_KEY, data);

  return first ?? data;
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readStored(FIRST_KEY) ?? captureAttribution();
}

export function getLastTouchAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readStored(LAST_KEY) ?? getAttribution();
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
