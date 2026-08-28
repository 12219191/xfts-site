import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Shield, Crown } from "lucide-react";
import { trackCTAClick, trackProductCta } from "@/lib/tracking";

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  badge?: string;
  tier: "basico" | "pro" | "enterprise";
  features: string[];
  priceId?: string;
  ctaLabel: string;
  /** Preço anual já com desconto (ex.: "R$ 950"). */
  annualPrice?: string;
  /** Lookup key do preço anual no Stripe. */
  annualPriceId?: string;
}

type CompareProduct = "clinica" | "barbearia" | "estetica" | "aba" | "crm" | "casa360";

interface PricingCardsProps {
  plans: PricingPlan[];
  trackingSection: string;
  onCheckout?: (priceId: string, label: string) => void;
  compareProduct?: CompareProduct;
  productName?: string;
}

export function PricingCards({ plans, trackingSection, onCheckout, compareProduct, productName }: PricingCardsProps) {
  const hasAnnual = plans.some((p) => p.annualPriceId);
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      {hasAnnual && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                annual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span className="ml-2 rounded-full bg-cta px-2 py-0.5 text-[10px] font-bold text-cta-foreground">
                -20%
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isPro = plan.tier === "pro";
          const isEnterprise = plan.tier === "enterprise";
          const useAnnual = annual && !!plan.annualPriceId;
          const shownPrice = useAnnual ? plan.annualPrice! : plan.price;
          const shownPeriod = useAnnual ? "/ano" : "/mês";
          const activePriceId = useAnnual ? plan.annualPriceId : plan.priceId;


          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all ${
                isPro
                  ? "border-cta bg-card shadow-xl shadow-cta/10 lg:scale-105 lg:z-10"
                  : isEnterprise
                  ? "border-gold-deep/40 bg-gradient-to-br from-card to-gold/[0.05] shadow-lg"
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {/* Badge */}
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-cta px-4 py-1 text-xs font-bold text-cta-foreground uppercase tracking-wide shadow-md shadow-cta/30">
                    Mais Popular
                  </span>
                </div>
              )}
              {isEnterprise && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold to-gold-deep px-4 py-1 text-xs font-bold text-gold-foreground uppercase tracking-wide shadow-md shadow-gold-deep/30">
                    <Crown className="h-3 w-3" /> Premium
                  </span>
                </div>
              )}

              <div className={`${isPro || isEnterprise ? "mt-2" : ""}`}>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-foreground">{shownPrice}</span>
                  <span className="text-base text-muted-foreground">{shownPeriod}</span>
                </div>
                {useAnnual && (
                  <p className="mt-1 text-xs font-medium text-cta">Equivale a 12 meses com 20% de desconto</p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              </div>

              {/* Features */}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-primary" : isEnterprise ? "text-gold-deep" : "text-primary"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-6">
                {isEnterprise ? (
                  <Link to="/contato">
                    <Button
                      className="w-full bg-gradient-to-r from-gold to-gold-deep text-gold-foreground hover:from-gold-deep hover:to-gold-deep shadow-md shadow-gold-deep/20"
                      onClick={() =>
                        trackCTAClick({
                          section: trackingSection,
                          action: `${plan.tier}-consultor`,
                          label: plan.ctaLabel,
                          destination: "/contato",
                        })
                      }
                    >
                      Falar com Consultor
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className={`w-full ${
                      isPro
                        ? "bg-cta text-cta-foreground hover:bg-cta/90 shadow-md shadow-cta/20"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    onClick={() => {
                      trackProductCta({
                        productKey: compareProduct ?? "geral",
                        productName: productName ?? "FLEXUS",
                        ctaAction: "buy",
                        label: plan.ctaLabel,
                        section: trackingSection,
                        destination: "/checkout",
                        placement: "precos",
                      });
                      if (activePriceId && onCheckout) {
                        onCheckout(activePriceId, plan.ctaLabel);
                      }

                    }}
                  >
                    {plan.ctaLabel}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guarantee + Compare link */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>7 dias grátis • Sem compromisso • Cancele quando quiser</span>
        </div>
        <Link
          to="/produtos/comparar-planos"
          search={{ produto: compareProduct }}
          className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          onClick={() =>
            trackCTAClick({
              section: trackingSection,
              action: "comparar-planos",
              label: "Comparar planos em detalhe",
              destination: "/produtos/comparar-planos",
            })
          }
        >
          {productName ? `Comparar os planos do ${productName} em detalhe` : "Comparar todos os planos em detalhe"} →
        </Link>
      </div>
    </div>
  );
}
