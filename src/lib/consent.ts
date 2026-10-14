/**
 * Consentimento de cookies (LGPD) + Google Consent Mode v2 + Meta Pixel.
 * Nenhum script de rastreamento é carregado antes do aceite.
 */

/** IDs de rastreamento, preenchidos no navegador a partir do servidor. Vazio = não carrega. */
export const TRACKING_IDS = { gtm: "", ga4: "", metaPixel: "" };

export function setTrackingIds(ids: Partial<typeof TRACKING_IDS>) {
  Object.assign(TRACKING_IDS, ids);
}

export type ConsentCategories = { essential: true; performance: boolean; marketing: boolean };
export type StoredConsent = { version: 1; date: string; categories: ConsentCategories };

const KEY = "xfts_cookie_consent";
export const OPEN_PREFS_EVENT = "xfts:open-cookie-prefs";

/** Script inline no <head>: Consent Mode v2 negado por padrão, antes de qualquer tag. */
export const CONSENT_DEFAULT_SCRIPT = `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});`;

export function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredConsent) : null;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(performance: boolean, marketing: boolean): StoredConsent {
  const value: StoredConsent = {
    version: 1,
    date: new Date().toISOString(),
    categories: { essential: true, performance, marketing },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage indisponível */
  }
  return value;
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFS_EVENT));
}

function addScript(id: string, src?: string, inline?: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  if (src) s.src = src;
  if (inline) s.text = inline;
  document.head.appendChild(s);
}

/** Atualiza o Consent Mode e carrega as tags permitidas. Seguro chamar várias vezes. */
export function applyConsent(c: ConsentCategories) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
  const g = (v: boolean) => (v ? "granted" : "denied");
  w.gtag?.("consent", "update", {
    analytics_storage: g(c.performance),
    ad_storage: g(c.marketing),
    ad_user_data: g(c.marketing),
    ad_personalization: g(c.marketing),
  });

  if (c.performance || c.marketing) {
    if (TRACKING_IDS.gtm) {
      addScript(
        "xfts-gtm",
        undefined,
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${TRACKING_IDS.gtm}');`,
      );
    }
  }
  // Com o Tag Manager ativo, o GA4 já vem configurado dentro dele: não carregar de novo (evita contagem dupla).
  if (c.performance && TRACKING_IDS.ga4 && !TRACKING_IDS.gtm) {
    addScript("xfts-ga4", `https://www.googletagmanager.com/gtag/js?id=${TRACKING_IDS.ga4}`);
    if (!document.getElementById("xfts-ga4-config")) {
      addScript("xfts-ga4-config", undefined, `gtag('js',new Date());gtag('config','${TRACKING_IDS.ga4}');`);
    }
  }

  if (c.marketing && TRACKING_IDS.metaPixel) {
    addScript(
      "xfts-meta",
      undefined,
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('consent','revoke');fbq('consent','grant');fbq('init','${TRACKING_IDS.metaPixel}');fbq('track','PageView');`,
    );
  } else if (!c.marketing) {
    w.fbq?.("consent", "revoke");
  } else {
    w.fbq?.("consent", "grant");
  }
}
