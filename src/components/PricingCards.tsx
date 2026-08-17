import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Shield, Crown } from "lucide-react";
import { trackCTAClick } from "@/lib/tracking";

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  badge?: string;
  tier: "basico" | "pro" | "enterprise";
  features: string[];
  priceId?: string;
  ctaLabel: string;
}

type CompareProduct = "clinica" | "barbearia" | "estetica" | "aba" | "crm";

interface PricingCardsProps {
  plans: PricingPlan[];
  trackingSection: string;
  onCheckout?: (priceId: string, label: string) => void;
  compareProduct?: CompareProduct;
  productName?: string;
}

export function PricingCards({ plans, trackingSection, onCheckout, compareProduct, productName }: PricingCardsProps) {
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isPro = plan.tier === "pro";
          const isEnterprise = plan.tier === "enterprise";

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all ${
                isPro
                  ? "border-cta bg-card shadow-xl shadow-cta/10 lg:scale-105 lg:z-10"
                  : isEnterprise
                  ? "border-amber-500/40 bg-gradient-to-br from-card to-amber-500/[0.03] shadow-lg"
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1 text-xs font-bold text-white uppercase tracking-wide shadow-md shadow-amber-500/30">
                    <Crown className="h-3 w-3" /> Premium
                  </span>
                </div>
              )}

              <div className={`${isPro || isEnterprise ? "mt-2" : ""}`}>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-base text-muted-foreground">/mês</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-cta" : isEnterprise ? "text-amber-500" : "text-primary"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-6">
                {isEnterprise ? (
                  <Link to="/contato">
                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20"
                      onClick={() => trackCTAClick(plan.ctaLabel, trackingSection)}
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
                      if (plan.priceId && onCheckout) {
                        onCheckout(plan.priceId, plan.ctaLabel);
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
          <Shield className="h-4 w-4 text-cta" />
          <span>7 dias grátis • Sem compromisso • Cancele quando quiser</span>
        </div>
        <Link
          to="/produtos/comparar-planos"
          search={{ produto: compareProduct }}
          className="text-sm text-cta underline underline-offset-4 hover:text-cta/80"
        >
          {productName ? `Comparar os planos do ${productName} em detalhe` : "Comparar todos os planos em detalhe"} →
        </Link>
      </div>
    </div>
  );
}
