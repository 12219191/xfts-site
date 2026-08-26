/**
 * Tipos e helpers client-safe do catálogo (produtos + planos) vindo do banco.
 * A escrita acontece só no Control Center; aqui é leitura/apresentação.
 */
import type { ProductPlan } from "@/lib/product-plans";
import type { EntitlementMap } from "@/lib/entitlements";

export interface CatalogProduct {
  key: string;
  name: string;
  url: string;
  landing: string;
  pricePrefix: string;
  available: boolean;
  sortOrder: number;
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
