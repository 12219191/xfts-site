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

/** Campos considerados na validação de coerência de um produto. */
export interface ProductValidationInput extends ProductFlags {
  key?: string;
  name?: string;
  url?: string;
  landing?: string;
  showOnWebsite: boolean;
  shortDescription?: string;
  imageUrl?: string;
  ctaHref?: string;
  betaNote?: string;
  hasActivePlan?: boolean;
}

export interface ProductValidation {
  /** Combinações conflitantes: impedem salvar. */
  errors: string[];
  /** Configurações permitidas, mas suspeitas. */
  warnings: string[];
}

/**
 * Valida a coerência entre status e as três chaves independentes
 * (site, contratação, Hub). Usada no Control Center e no servidor.
 */
export function validateProduct(product: ProductValidationInput): ProductValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = statusLabel(product.status);

  if (product.availableForPurchase && !statusAllowsPurchase(product.status)) {
    errors.push(
      `“Pode ser contratado” não funciona com o status “${label}”. Mude o status para Disponível/Acesso antecipado ou desligue a contratação.`,
    );
  }
  if (product.availableInHub && !statusAllowsAccess(product.status)) {
    errors.push(
      "“Aparece no Hub” não funciona com produtos em desenvolvimento. Mude o status ou desligue o acesso no Hub.",
    );
  }
  if (canPurchase(product) && !product.availableInHub) {
    errors.push(
      "O produto pode ser contratado mas não aparece no Hub: quem comprar ficaria sem porta de entrada. Ligue “Aparece no Hub” ou desligue a contratação.",
    );
  }
  if (canPurchase(product) && !product.showOnWebsite) {
    errors.push(
      "O produto pode ser contratado mas está oculto no site: não haveria página para comprar. Ligue “Mostrar no site” ou desligue a contratação.",
    );
  }
  if (product.availableInHub && !product.url?.trim()) {
    errors.push(
      "Para aparecer no Hub o produto precisa do endereço do sistema (URL).",
    );
  }
  if (canPurchase(product) && product.hasActivePlan === false) {
    errors.push("O produto pode ser contratado, mas não tem nenhum plano ativo.");
  }
  if (product.showOnWebsite && !product.landing?.trim() && !product.ctaHref?.trim()) {
    errors.push("Produto visível no site precisa de uma página de destino (landing ou CTA).");
  }

  if (product.showOnWebsite && !product.shortDescription?.trim()) {
    warnings.push("Sem descrição curta: o card no site ficará vazio.");
  }
  if (product.showOnWebsite && !product.imageUrl?.trim()) {
    warnings.push("Sem imagem: o card usará a imagem padrão do código.");
  }
  if (product.status === "beta" && !product.betaNote?.trim()) {
    warnings.push("Produto em acesso antecipado sem aviso de beta.");
  }
  if (product.status === "discontinued" && product.showOnWebsite) {
    warnings.push("Produto descontinuado continua aparecendo no site.");
  }
  if (product.status === "active" && !product.availableForPurchase) {
    warnings.push("Produto ativo sem contratação: o site mostrará apenas “Saiba mais”.");
  }

  return { errors, warnings };
}





/** Tiers padrão dos produtos FLEXUS e tiers próprios por produto (mapa único). */
export const DEFAULT_PLAN_TIERS = ["basico", "pro", "enterprise"] as const;
export const PRODUCT_PLAN_TIERS: Record<string, readonly string[]> = {
  atende: ["basic", "standard", "corporate"],
};
export type DefaultPlanTier = (typeof DEFAULT_PLAN_TIERS)[number];
export type PlanTier = DefaultPlanTier | "basic" | "standard" | "corporate";

export function tiersForProduct(productKey: string): readonly string[] {
  return PRODUCT_PLAN_TIERS[productKey] ?? DEFAULT_PLAN_TIERS;
}

/** Tiers aceitos em cortesia: próprios do produto, ou basico/pro nos padrões. */
export function courtesyTiersForProduct(productKey: string): readonly string[] {
  return PRODUCT_PLAN_TIERS[productKey] ?? ["basico", "pro"];
}

/** Erro se o tier não pertence ao produto ou se o plano muda de produto. Sem coerção. */
export function planTierError(
  productKey: string,
  tier: string,
  existingProductKey?: string | null,
): string | null {
  if (existingProductKey && existingProductKey !== productKey) {
    return "O plano pertence a outro produto.";
  }
  const allowed = tiersForProduct(productKey);
  if (!allowed.includes(tier)) {
    return `Tier "${tier}" inválido para ${productKey}. Use: ${allowed.join(", ")}.`;
  }
  return null;
}

export interface CatalogPlan {
  id: string;
  productKey: string;
  name: string;
  tier: PlanTier;
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
    ...(plan.seats ? { seats: plan.seats } : {}),
    ...(plan.trialDays ? { trialDays: plan.trialDays } : {}),
  };
}

/** Planos ativos de um produto, no formato do site. */
export function plansForProduct(snapshot: CatalogSnapshot, productKey: string): ProductPlan[] {
  return snapshot.plans
    .filter((p) => p.productKey === productKey && p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toProductPlan);
}
