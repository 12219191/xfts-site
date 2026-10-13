/**
 * Tags de anúncio/analytics a partir de variáveis de ambiente (VITE_*).
 * Sem ID válido a tag simplesmente não é carregada — nada de ID de exemplo em produção.
 * Os IDs entram em trechos de script, por isso são validados por formato.
 */

export type TagIds = {
  gtm?: string;
  ga4?: string;
  metaPixel?: string;
  linkedinPartner?: string;
};

export type HeadScript = { src?: string; async?: boolean; children?: string };

const FORMATS = {
  gtm: /^GTM-[A-Z0-9]{4,12}$/,
  ga4: /^G-[A-Z0-9]{4,14}$/,
  metaPixel: /^\d{6,20}$/,
  linkedinPartner: /^\d{3,12}$/,
} as const;

function valid(kind: keyof typeof FORMATS, raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return FORMATS[kind].test(v) ? v : undefined;
}

export function readTagIds(env: Record<string, unknown>): TagIds {
  return {
    gtm: valid("gtm", env["VITE_GTM_ID"]),
    ga4: valid("ga4", env["VITE_GA4_ID"]),
    metaPixel: valid("metaPixel", env["VITE_META_PIXEL_ID"]),
    linkedinPartner: valid("linkedinPartner", env["VITE_LINKEDIN_PARTNER_ID"]),
  };
}

export function buildHeadScripts(ids: TagIds): HeadScript[] {
  const scripts: HeadScript[] = [];

  if (ids.gtm) {
    scripts.push({
      children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${ids.gtm}');`,
    });
  }

  if (ids.ga4) {
    scripts.push({ src: `https://www.googletagmanager.com/gtag/js?id=${ids.ga4}`, async: true });
    scripts.push({
      children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ids.ga4}');`,
    });
  }

  if (ids.metaPixel) {
    scripts.push({
      children: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${ids.metaPixel}');
fbq('track', 'PageView');`,
    });
  }

  if (ids.linkedinPartner) {
    // Insight Tag: grava o cookie li_fat_id, lido por attribution.ts.
    scripts.push({
      children: `_linkedin_partner_id = "${ids.linkedinPartner}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);`,
    });
  }

  return scripts;
}

export type NoscriptTag = { kind: "iframe" | "img"; src: string };

export function buildNoscriptTags(ids: TagIds): NoscriptTag[] {
  const tags: NoscriptTag[] = [];
  if (ids.gtm) tags.push({ kind: "iframe", src: `https://www.googletagmanager.com/ns.html?id=${ids.gtm}` });
  if (ids.metaPixel) {
    tags.push({ kind: "img", src: `https://www.facebook.com/tr?id=${ids.metaPixel}&ev=PageView&noscript=1` });
  }
  if (ids.linkedinPartner) {
    tags.push({
      kind: "img",
      src: `https://px.ads.linkedin.com/collect/?pid=${ids.linkedinPartner}&fmt=gif`,
    });
  }
  return tags;
}
