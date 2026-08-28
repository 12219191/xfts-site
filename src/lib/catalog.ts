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
  /** Pode ser contratado (limitado pelo teto do status). */
  availableForPurchase: boolean;
  /** Aparece como aplicação acessível no Hub. */
  availableInHub: boolean;
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

/** Conjunto mínimo de regras de um produto (status + chaves independentes). */
export interface ProductFlags {
  status: ProductStatus;
  availableForPurchase: boolean;
  availableInHub: boolean;
}

/** O status permite venda? (teto: development/paused/discontinued nunca vendem) */
export function statusAllowsPurchase(status: ProductStatus): boolean {
  return status === "active" || status === "beta";
}

/** O status permite acesso de quem já assina? */
export function statusAllowsAccess(status: ProductStatus): boolean {
  return status !== "development";
}

/** Produtos que podem ser contratados agora. */
export function canPurchase(product: ProductFlags): boolean {
  return statusAllowsPurchase(product.status) && product.availableForPurchase;
}

/** Produtos cujos assinantes ainda podem entrar no sistema pelo Hub. */
export function canAccess(product: ProductFlags): boolean {
  return statusAllowsAccess(product.status) && product.availableInHub;
}

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case "active":
      return "Disponível";
    case "beta":
      return "Acesso antecipado";
    case "development":
      return "Em breve";
    case "paused":
      return "Temporariamente indisponível";
    case "discontinued":
      return "Descontinuado";
  }
}

export interface SiteCta {
  /** Selo exibido no card/landing (null quando não há). */
  badge: string | null;
  /** Rótulo sugerido para o botão principal. */
  label: string;
  /** buy = leva ao checkout; learn = leva à landing; none = sem ação. */
  action: "buy" | "learn" | "none";
  /** Mostrar preços na página? */
  showPricing: boolean;
  /** Aviso exibido junto ao CTA, quando houver. */
  notice: string | null;
}

/** Como o site interpreta status + chaves. */
export function siteCta(product: ProductFlags & { ctaLabel?: string }): SiteCta {
  const buyable = canPurchase(product);
  switch (product.status) {
    case "development":
      return {
        badge: "Em breve",
        label: "Em breve",
        action: "none",
        showPricing: false,
        notice: null,
      };
    case "paused":
      return {
        badge: statusLabel("paused"),
        label: "Saiba mais",
        action: "learn",
        showPricing: false,
        notice: "Novas contratações estão temporariamente suspensas.",
      };
    case "discontinued":
      return {
        badge: "Descontinuado",
        label: "Saiba mais",
        action: "learn",
        showPricing: false,
        notice: "Produto descontinuado para novas contratações.",
      };
    case "beta":
      return {
        badge: "Acesso antecipado",
        label: buyable ? product.ctaLabel || "Comece agora" : "Saiba mais",
        action: buyable ? "buy" : "learn",
        showPricing: buyable,
        notice: null,
      };
    case "active":
    default:
      return {
        badge: null,
        label: buyable ? product.ctaLabel || "Comece agora" : "Saiba mais",
        action: buyable ? "buy" : "learn",
        showPricing: buyable,
        notice: null,
      };
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
