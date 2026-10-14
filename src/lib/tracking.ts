import { currentPage, resolvePage } from "@/lib/page-registry";

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

export type CtaClick = {
  /** identificador canônico: pagina.secao.acao */
  cta_id: string;
  /** texto visível do botão */
  cta_label: string;
  /** slug canônico da página onde o clique ocorreu */
  cta_page: string;
  /** nome legível da página */
  cta_page_name: string;
  /** seção da página (hero, pricing, header, footer...) */
  cta_section: string;
  /** tipo/posição do clique: topo, rodape, card, hero, precos, flutuante, corpo */
  cta_placement: CtaPlacement;
  /** destino do clique (rota ou URL), quando informado */
  cta_destination?: string;
  ts: number;
};

export type CtaPlacement =
  | "topo"
  | "rodape"
  | "card"
  | "hero"
  | "precos"
  | "flutuante"
  | "corpo";

export const PLACEMENT_LABEL: Record<CtaPlacement, string> = {
  topo: "Topo (header)",
  rodape: "Rodapé",
  card: "Card",
  hero: "Hero",
  precos: "Preços",
  flutuante: "Botão flutuante",
  corpo: "Corpo da página",
};

/** Deriva o tipo de clique a partir da seção quando não informado explicitamente. */
export function derivePlacement(section: string): CtaPlacement {
  const s = section.toLowerCase();
  if (s.includes("footer") || s.includes("rodape")) return "rodape";
  if (s.includes("header") || s.includes("topo") || s.includes("nav")) return "topo";
  if (s.includes("card")) return "card";
  if (s.includes("hero")) return "hero";
  if (s.includes("pricing") || s.includes("preco") || s.includes("plano")) return "precos";
  if (s.includes("float") || s.includes("whatsapp") || s.includes("flutuante")) return "flutuante";
  return "corpo";
}

const LAST_CTA_KEY = "xfts_last_cta";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Último CTA clicado nesta sessão (usado para atribuir formulários). */
export function getLastCtaClick(): CtaClick | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_CTA_KEY);
    return raw ? (JSON.parse(raw) as CtaClick) : null;
  } catch {
    return null;
  }
}

function storeLastCta(click: CtaClick) {
  try {
    sessionStorage.setItem(LAST_CTA_KEY, JSON.stringify(click));
  } catch {
    /* storage indisponível */
  }
}

type CtaInput = {
  /** seção da página: hero, pricing, header, footer, cards... */
  section: string;
  /** ação/destino curto: demo, contato, assinar-pro, card-crm... */
  action?: string;
  /** texto visível do botão */
  label: string;
  /** rota ou URL de destino */
  destination?: string;
  /** sobrescreve o slug da página (raro) */
  page?: string;
  /** tipo/posição do clique; se omitido é derivado da seção */
  placement?: CtaPlacement;
};

/**
 * Registra o clique de um CTA com nomenclatura padronizada `pagina.secao.acao`.
 * Aceita também a forma antiga `trackCTAClick(label, location)`.
 */
export function trackCTAClick(input: CtaInput | string, legacyLocation?: string) {
  let section: string;
  let action: string;
  let label: string;
  let destination: string | undefined;
  let pageSlug: string;
  let pageName: string;
  let placement: CtaPlacement | undefined;

  const page = typeof window === "undefined" ? resolvePage("/") : currentPage();

  if (typeof input === "string") {
    label = input;
    section = legacyLocation ?? "desconhecida";
    action = slugify(input);
    pageSlug = page.slug;
    pageName = page.name;
  } else {
    label = input.label;
    section = input.section;
    action = input.action ?? slugify(input.label);
    destination = input.destination;
    pageSlug = input.page ?? page.slug;
    pageName = input.page ? input.page : page.name;
    placement = input.placement;
  }

  const ctaId = `${pageSlug}.${slugify(section)}.${slugify(action)}`;
  const click: CtaClick = {
    cta_id: ctaId,
    cta_label: label,
    cta_page: pageSlug,
    cta_page_name: pageName,
    cta_section: section,
    cta_placement: placement ?? derivePlacement(section),
    cta_destination: destination,
    ts: Date.now(),
  };

  storeLastCta(click);

  const params = {
    cta_id: ctaId,
    cta_label: label,
    cta_page: pageSlug,
    cta_page_name: pageName,
    cta_section: section,
    cta_placement: click.cta_placement,
    cta_placement_label: PLACEMENT_LABEL[click.cta_placement],
    cta_destination: destination ?? "",
    // compatibilidade com relatórios antigos
    cta_location: `${pageSlug}-${slugify(section)}`,
  };
  pushGTM("cta_click", params);
  pushGA4("cta_click", params);
  // Lead na Meta é enviado só pelo GTM (envio do formulário de demonstração).
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", "CTA_Click", { content_name: label, content_category: ctaId });
  }
}


/**
 * Clique de um CTA de produto ("Comece agora" / "Saiba mais" / "Em breve").
 * Emite `product_cta_click` com o produto e a intenção, além do cta_click padrão.
 */
export function trackProductCta(input: {
  /** chave do produto no catálogo (crm, casa360...) */
  productKey: string;
  /** nome exibido do produto */
  productName: string;
  /** buy | learn | none */
  ctaAction: string;
  /** status do produto no catálogo */
  productStatus?: string;
  label: string;
  section: string;
  destination?: string;
  placement?: CtaPlacement;
}) {
  const params = {
    product_key: input.productKey,
    product_name: input.productName,
    product_status: input.productStatus ?? "",
    cta_action: input.ctaAction,
    cta_label: input.label,
    cta_section: input.section,
    cta_destination: input.destination ?? "",
  };
  pushGTM("product_cta_click", params);
  pushGA4("product_cta_click", params);
  pushMeta("ViewContent", {
    content_name: input.productName,
    content_type: "product",
    content_category: input.ctaAction,
  });

  trackCTAClick({
    section: input.section,
    action: `${input.ctaAction}-${input.productKey}`,
    label: `${input.label} — ${input.productName}`,
    destination: input.destination,
    placement: input.placement,
  });
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
  // Não enviado à Meta: evento sem uso lá.
}

/** Track a form submission (demo request or contact) */
export function trackFormSubmit(formType: "demo" | "contato", segmento: string) {
  const params = { form_type: formType, segmento };
  pushGTM("form_submit", params);
  pushGA4("generate_lead", { currency: "BRL", value: 0, ...params });
  pushMeta("CompleteRegistration", { content_name: formType, status: segmento });
}
