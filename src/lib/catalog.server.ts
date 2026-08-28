/** Leitura do catálogo no banco, com fallback para o catálogo em código. */
import { createClient } from "@supabase/supabase-js";
import type {
  CatalogPlan,
  CatalogProduct,
  CatalogSnapshot,
  ProductStatus,
} from "@/lib/catalog";
import { FLEXUS_APPS } from "@/lib/flexus-apps";
import { PLANS_BY_APP } from "@/lib/product-plans";
import { parseEntitlements } from "@/lib/entitlements";
import { productContent } from "@/lib/product-content";

function parseBRL(value?: string): number {
  if (!value) return 0;
  const digits = value.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round(Number(digits || 0) * 100);
}

/** Catálogo montado a partir dos arquivos de código (rede de segurança). */
export function codeCatalog(): CatalogSnapshot {
  const products: CatalogProduct[] = FLEXUS_APPS.map((app, index) => {
    const content = productContent(app.key);
    return {
      key: app.key,
      name: app.name,
      url: app.url,
      landing: app.landing,
      pricePrefix: app.pricePrefix,
      available: app.available,
      sortOrder: index + 1,
      status: (app.available ? "active" : "development") as ProductStatus,
      showOnWebsite: true,
      availableForPurchase: app.available,
      availableInHub: app.available,
      betaNote: "",

      displayName: app.name,
      shortDescription: content.shortDescription,
      headline: "",
      subheadline: "",
      icon: content.icon,
      ctaLabel: "Saiba Mais",
      ctaHref: app.landing,
      imageUrl: content.imageUrl,
      imageAlt: content.imageAlt,
    };
  });


  const plans: CatalogPlan[] = [];
  for (const app of FLEXUS_APPS) {
    (PLANS_BY_APP[app.key] ?? []).forEach((plan, index) => {
      plans.push({
        id: `${app.key}:${plan.name}`,
        productKey: app.key,
        name: plan.name,
        tier: plan.tier,
        description: plan.description,
        priceMonthCents: parseBRL(plan.price),
        priceYearCents: plan.annualPrice ? parseBRL(plan.annualPrice) : null,
        features: plan.features,
        seats: null,
        ctaLabel: plan.ctaLabel,
        priceLookupKey: plan.priceId ?? null,
        annualLookupKey: plan.annualPriceId ?? null,
        active: true,
        sortOrder: index + 1,
        trialDays: 0,
        entitlements: {},
      });
    });
  }

  return { products, plans, fallback: true };
}

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

type ProductRow = {
  key: string;
  name: string;
  url: string;
  landing: string;
  price_prefix: string;
  available: boolean;
  sort_order: number;
  status?: string | null;
  show_on_website?: boolean | null;
  beta_note?: string | null;
  display_name?: string | null;
  short_description?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  icon?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  available_for_purchase?: boolean | null;
  available_in_hub?: boolean | null;

};

type PlanRow = {
  id: string;
  product_key: string;
  name: string;
  tier: string;
  description: string;
  price_month_cents: number;
  price_year_cents: number | null;
  features: unknown;
  seats: number | null;
  cta_label: string;
  price_lookup_key: string | null;
  annual_lookup_key: string | null;
  active: boolean;
  sort_order: number;
  trial_days?: number | null;
  entitlements?: unknown;
};

export function mapProduct(row: ProductRow): CatalogProduct {
  const content = productContent(row.key);
  const status = ((row.status as ProductStatus) ??
    (row.available ? "active" : "development")) as ProductStatus;
  return {
    key: row.key,
    name: row.name,
    url: row.url ?? "",
    landing: row.landing ?? "",
    pricePrefix: row.price_prefix,
    available: status === "active" || status === "beta",
    sortOrder: row.sort_order,
    status,
    showOnWebsite: row.show_on_website ?? true,
    availableForPurchase:
      row.available_for_purchase ?? (status === "active" || status === "beta"),
    availableInHub: row.available_in_hub ?? status !== "development",
    betaNote: row.beta_note ?? "",

    displayName: row.display_name?.trim() || row.name,
    shortDescription: row.short_description?.trim() || content.shortDescription,
    headline: row.headline ?? "",
    subheadline: row.subheadline ?? "",
    icon: row.icon?.trim() || content.icon,
    ctaLabel: row.cta_label?.trim() || "Saiba Mais",
    ctaHref: row.cta_href?.trim() || row.landing || "",
    imageUrl: row.image_url?.trim() || content.imageUrl,
    imageAlt: row.image_alt?.trim() || content.imageAlt,
  };
}


export function mapPlan(row: PlanRow): CatalogPlan {
  return {
    id: row.id,
    productKey: row.product_key,
    name: row.name,
    tier: (row.tier as CatalogPlan["tier"]) ?? "basico",
    description: row.description ?? "",
    priceMonthCents: row.price_month_cents ?? 0,
    priceYearCents: row.price_year_cents,
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    seats: row.seats,
    ctaLabel: row.cta_label ?? "Começar Agora",
    priceLookupKey: row.price_lookup_key,
    annualLookupKey: row.annual_lookup_key,
    active: row.active,
    sortOrder: row.sort_order,
    trialDays: row.trial_days ?? 0,
    entitlements: parseEntitlements(row.entitlements),
  };
}

/** Catálogo público (somente planos ativos). Nunca lança: cai para o código. */
export async function loadPublicCatalog(): Promise<CatalogSnapshot> {
  try {
    const client = publicClient();
    if (!client) return codeCatalog();
    const [products, plans] = await Promise.all([
      client.from("catalog_products").select("*").order("sort_order"),
      client.from("catalog_plans").select("*").eq("active", true).order("sort_order"),
    ]);
    if (products.error || plans.error) return codeCatalog();
    const productRows = (products.data ?? []) as unknown as ProductRow[];
    const planRows = (plans.data ?? []) as unknown as PlanRow[];
    if (productRows.length === 0 || planRows.length === 0) return codeCatalog();
    return {
      products: productRows.map(mapProduct),
      plans: planRows.map(mapPlan),
      fallback: false,
    };
  } catch {
    return codeCatalog();
  }
}

/**
 * Status operacional dos produtos (inclusive os ocultos no site).
 * Usado para liberar/bloquear compra e acesso. Nunca lança.
 */
export async function loadProductStatuses(): Promise<Record<string, ProductStatus>> {
  const fallback: Record<string, ProductStatus> = {};
  for (const app of FLEXUS_APPS) fallback[app.key] = app.available ? "active" : "development";
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("catalog_products").select("key, status");
    if (error || !data || data.length === 0) return fallback;
    const map: Record<string, ProductStatus> = { ...fallback };
    for (const row of data as { key: string; status: string | null }[]) {
      if (row.status) map[row.key] = row.status as ProductStatus;
    }
    return map;
  } catch {
    return fallback;
  }
}

/** Status de um produto (fallback: catálogo em código). */
export async function productStatusOf(key: string): Promise<ProductStatus> {
  const map = await loadProductStatuses();
  return map[key] ?? "development";
}
