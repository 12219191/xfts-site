/**
 * Tipos e helpers client-safe do catálogo (produtos + planos) vindo do banco.
 * A escrita acontece só no Control Center; aqui é leitura/apresentação.
 */
import type { ProductPlan } from "@/lib/product-plans";
import type { EntitlementMap } from "@/lib/entitlements";

/** Ciclo de vida do produto (independente de aparecer ou não no site). */
export type ProductStatus =
  | "active"
  | "development"
  | "beta"
  | "paused"
  | "discontinued";

export interface CatalogProduct {
  key: string;
  name: string;
  url: string;
  landing: string;
  pricePrefix: string;
  /** Compatibilidade: equivale a status === "active" || "beta". */
  available: boolean;
  sortOrder: number;
  status: ProductStatus;
  showOnWebsite: boolean;
  betaNote: string;
  /** Título usado no site (cai para `name` quando vazio). */
  displayName: string;
  shortDescription: string;
  headline: string;
  subheadline: string;
  /** Nome do ícone lucide usado nos cards. */
  icon: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
}

/** Produtos que podem ser contratados agora. */
export function canPurchase(status: ProductStatus): boolean {
  return status === "active" || status === "beta";
}

/** Produtos cujos assinantes ainda podem entrar no sistema. */
export function canAccess(status: ProductStatus): boolean {
  return status !== "development";
}

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case "active":
      return "Disponível";
    case "beta":
      return "Beta";
    case "development":
      return "Em breve";
    case "paused":
      return "Temporariamente indisponível";
    case "discontinued":
      return "Descontinuado";
  }
}


export interface CatalogPlan {
  id: string;
  productKey: string;
  name: string;
  tier: "basico" | "pro" | "enterprise";
  description: string;
  priceMonthCents: number;
  priceYearCents: number | null;
  features: string[];
  seats: number | null;
  ctaLabel: string;
  priceLookupKey: string | null;
  annualLookupKey: string | null;
  active: boolean;
  sortOrder: number;
  /** Dias de teste grátis oferecidos na primeira contratação (0 = sem teste). */
  trialDays: number;
  /** Recursos e limites liberados por este plano. */
  entitlements: EntitlementMap;
}

export interface CatalogSnapshot {
  products: CatalogProduct[];
  plans: CatalogPlan[];
  /** true quando veio do fallback em código (banco indisponível). */
  fallback: boolean;
}

/** Formata centavos no padrão usado no site (ex.: 191000 -> "R$ 1.910"). */
export function formatBRL(cents: number): string {
  const value = cents / 100;
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Converte um plano do banco para o formato consumido por PricingCards. */
export function toProductPlan(plan: CatalogPlan): ProductPlan {
  return {
    name: plan.name,
    price: formatBRL(plan.priceMonthCents),
    description: plan.description,
    tier: plan.tier,
    features: plan.features,
    ...(plan.priceLookupKey ? { priceId: plan.priceLookupKey } : {}),
    ctaLabel: plan.ctaLabel,
    ...(plan.priceYearCents ? { annualPrice: formatBRL(plan.priceYearCents) } : {}),
    ...(plan.annualLookupKey ? { annualPriceId: plan.annualLookupKey } : {}),
  };
}

/** Planos ativos de um produto, no formato do site. */
export function plansForProduct(snapshot: CatalogSnapshot, productKey: string): ProductPlan[] {
  return snapshot.plans
    .filter((p) => p.productKey === productKey && p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toProductPlan);
}
