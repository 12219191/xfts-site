import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";
import { PaymentInfoSection } from "@/components/product/PaymentInfoSection";
import { useProductImage, useProductImageAlt, type ProductSlug } from "@/lib/product-images";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { trackCTAClick } from "@/lib/tracking";
import { canPurchase, statusLabel, type CatalogProduct } from "@/lib/catalog";
import type { ProductPlan } from "@/lib/product-plans";
import type { FlexusAppKey } from "@/lib/flexus-apps";

interface Props {
  productKey: ProductSlug;
  app: FlexusAppKey;
  /** Produto do Control Center (null quando o banco não respondeu). */
  product: CatalogProduct | null;
  plans: ProductPlan[];
  /** Textos de reserva quando o Control Center não tem o campo preenchido. */
  fallback: {
    name: string;
    headline: string;
    subheadline: string;
    description: string;
    features: string[];
    plansSubtitle: string;
  };
}

/** Junta os recursos dos planos ativos, sem repetição, na ordem dos planos. */
function featuresFromPlans(plans: ProductPlan[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const plan of plans) {
    for (const raw of plan.features) {
      const f = raw.trim();
      if (!f) continue;
      const key = f.toLowerCase();
      if (key.startsWith("tudo do")) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

export function ProductPageLayout({ productKey, app, product, plans, fallback }: Props) {
  const heroImage = useProductImage(productKey);
  const heroAlt = useProductImageAlt(productKey);
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const name = product?.displayName?.trim() || product?.name?.trim() || fallback.name;
  const headline = product?.headline?.trim() || fallback.headline;
  const subheadline =
    product?.subheadline?.trim() || product?.shortDescription?.trim() || fallback.subheadline;
  const description = product?.shortDescription?.trim() || fallback.description;

  const purchasable = product ? canPurchase(product) : true;
  const betaNote = product?.status === "beta" ? product.betaNote?.trim() : "";
  const showStatusBadge = !!product && product.status !== "active";

  const planFeatures = featuresFromPlans(plans);
  const features = planFeatures.length >= 4 ? planFeatures : fallback.features;
  const showPricing = purchasable && plans.length > 0;

  const handleCheckout = (priceId: string) => {
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <>
      {isOpen && CheckoutForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-lg rounded-xl bg-background p-6 shadow-2xl">
            <button
              onClick={closeCheckout}
              aria-label="Fechar checkout"
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <CheckoutForm />
          </div>
        </div>
      )}

      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt={heroAlt}
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          {showStatusBadge && (
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {statusLabel(product!.status)}
            </span>
          )}
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">
            {headline}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">{subheadline}</p>
          {betaNote && (
            <p className="mt-3 max-w-xl rounded-lg bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground/90">
              {betaNote}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato">
              <Button
                size="lg"
                className="bg-cta text-cta-foreground hover:bg-cta/90"
                onClick={() => trackCTAClick({ section: "hero", label: "Solicitar Demo" })}
              >
                Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <AcessarSistemaButton app={app} size="lg" variant="heroOutline" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">O que o {name} faz</h2>
            <p className="mt-3 text-muted-foreground">{description}</p>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground"
              >
                <Check className="h-5 w-5 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Planos e Preços</h2>
            <p className="mt-3 text-muted-foreground">{fallback.plansSubtitle}</p>
          </div>

          {showPricing ? (
            <div className="mt-12">
              <PricingCards
                plans={plans}
                trackingSection="pricing"
                onCheckout={handleCheckout}
                compareProduct={productKey}
                productName={name}
              />
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Valores sob consulta neste momento
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {purchasable
                  ? `Os planos do ${name} estão sendo atualizados. Fale com o nosso time para receber a proposta com valores e formas de pagamento.`
                  : `O ${name} ainda não está disponível para contratação online. Fale com o nosso time para entrar na lista e receber condições.`}
              </p>
              <Link to="/contato" className="mt-6 inline-block">
                <Button
                  className="bg-cta text-cta-foreground hover:bg-cta/90"
                  onClick={() =>
                    trackCTAClick({
                      section: "pricing",
                      action: "falar-com-time",
                      label: "Falar com o time",
                      destination: "/contato",
                    })
                  }
                >
                  Falar com o time <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <PaymentInfoSection />
    </>
  );
}
