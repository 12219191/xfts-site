import type { ProductStatus } from "@/lib/catalog";
import type { ProductPlan } from "@/lib/product-plans";

export type ProductHeroCta = {
  label: string;
  destination: "pricing" | "contact" | "waitlist";
  trialDays: number | null;
};

/** CTA comercial derivado do catálogo, sem prometer trial a produtos não vendáveis. */
export function getProductHeroCta({
  status,
  purchasable,
  contactOnly = false,
  plans,
}: {
  status: ProductStatus | null;
  purchasable: boolean;
  contactOnly?: boolean;
  plans: ProductPlan[];
}): ProductHeroCta {
  if (status === "development") {
    return { label: "Entrar na lista de espera", destination: "waitlist", trialDays: null };
  }
  if (contactOnly || !purchasable) {
    return { label: "Agendar demonstração", destination: "contact", trialDays: null };
  }

  const sellable = plans.filter((p) => !!p.priceId || !!p.annualPriceId);
  if (!sellable.length) {
    return { label: "Agendar demonstração", destination: "contact", trialDays: null };
  }

  const trialDays = sellable
    .filter((p) => !!p.priceId && Number.isInteger(p.trialDays) && (p.trialDays ?? 0) > 0)
    .map((p) => p.trialDays!);

  return trialDays.length
    ? { label: "Começar teste grátis", destination: "pricing", trialDays: Math.min(...trialDays) }
    : { label: "Conhecer os planos", destination: "pricing", trialDays: null };
}
