// Utility for firing tracking events across GTM/GA4 and Meta Pixel
// Replace placeholder IDs in __root.tsx when you have real ones.

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    fbq: (...args: unknown[]) => void;
    gtag: (...args: unknown[]) => void;
  }
}

/** Push a custom event to GTM dataLayer + GA4 gtag */
function pushGTM(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({ event, ...params });
  }
}

function pushGA4(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }
}

function pushMeta(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", event, params);
  }
}

/** Track a CTA button click */
export function trackCTAClick(label: string, location: string) {
  const params = { cta_label: label, cta_location: location };
  pushGTM("cta_click", params);
  pushGA4("cta_click", params);
  pushMeta("Lead", { content_name: label, content_category: location });
}

/** Track a "Saiba Mais" / product link click */
export function trackProductClick(productName: string) {
  const params = { product_name: productName };
  pushGTM("product_click", params);
  pushGA4("select_content", { content_type: "product", item_id: productName });
  pushMeta("ViewContent", { content_name: productName, content_type: "product" });
}

/** Track scroll depth milestone */
export function trackScrollDepth(percent: number, pagePath: string) {
  const params = { percent, page_path: pagePath };
  pushGTM("scroll_depth", params);
  pushGA4("scroll_depth", params);
  pushMeta("CustomEvent", { content_name: "scroll_depth", value: percent, content_category: pagePath });
}

/** Track time on page milestone */
export function trackTimeOnPage(seconds: number, pagePath: string) {
  const params = { seconds, page_path: pagePath };
  pushGTM("time_on_page", params);
  pushGA4("time_on_page", params);
  pushMeta("CustomEvent", { content_name: "time_on_page", value: seconds, content_category: pagePath });
}

/** Track a form submission (demo request or contact) */
export function trackFormSubmit(formType: "demo" | "contato", segmento: string) {
  const params = { form_type: formType, segmento };
  pushGTM("form_submit", params);
  pushGA4("generate_lead", { currency: "BRL", value: 0, ...params });
  pushMeta("CompleteRegistration", { content_name: formType, status: segmento });
}
  const params = { form_type: formType, segmento };
  pushGTM("form_submit", params);
  pushGA4("generate_lead", { currency: "BRL", value: 0, ...params });
  pushMeta("CompleteRegistration", { content_name: formType, status: segmento });
}
