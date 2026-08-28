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
  return {
    key: row.key,
    name: row.name,
    url: row.url ?? "",
    landing: row.landing ?? "",
    pricePrefix: row.price_prefix,
    available: row.available,
    sortOrder: row.sort_order,
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
