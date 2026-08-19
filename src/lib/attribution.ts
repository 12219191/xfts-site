export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
};

const STORAGE_KEY = "xfts_attribution";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

function readStored(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/**
 * Captura a atribuição de primeira visita (first-touch) na sessão.
 * Deve ser chamada apenas no navegador (useEffect / handler).
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};

  const stored = readStored();
  if (stored) return stored;

  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) data[key] = value.slice(0, 160);
  }

  const ref = typeof document === "undefined" ? "" : document.referrer;
  if (ref && !ref.startsWith(window.location.origin)) {
    data.referrer = ref.slice(0, 255);
  }
  data.landing_page = `${window.location.pathname}${window.location.search}`.slice(0, 255);

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* sessionStorage indisponível (modo privado) */
  }
  return data;
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readStored() ?? captureAttribution();
}
