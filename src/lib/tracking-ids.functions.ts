import { createServerFn } from "@tanstack/react-start";

/** IDs públicos de rastreamento (não são segredos; ficam visíveis no navegador de qualquer forma). */
export const getTrackingIds = createServerFn({ method: "GET" }).handler(async () => {
  const clean = (v: string | undefined, re: RegExp) => {
    const s = (v ?? "").trim();
    return re.test(s) ? s : "";
  };
  return {
    ga4: clean(process.env["GOOGLE_ANALYTICS_MEASUREMENT_ID"], /^G-[A-Z0-9]{4,20}$/),
    gtm: clean(process.env["GOOGLE_TAG_MANAGER_ID"], /^GTM-[A-Z0-9]{4,12}$/),
    metaPixel: clean(process.env["META_PIXEL_ID"], /^\d{6,20}$/),
    linkedinPartner: clean(process.env["LINKEDIN_PARTNER_ID"], /^\d{3,12}$/),
  };
});
