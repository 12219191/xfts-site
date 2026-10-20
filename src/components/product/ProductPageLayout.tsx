import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";
import { PaymentInfoSection } from "@/components/product/PaymentInfoSection";
import { ProductImage } from "@/components/product/ProductImage";
import { useProductImage, useProductImageAlt, type ProductSlug } from "@/lib/product-images";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { CheckoutModal } from "@/components/CheckoutModal";
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
  /** Só contato/demo: sem "Acessar Sistema" e sem seção de pagamento enquanto não vende. */
  contactOnly?: boolean;
  /** Aviso sempre visível abaixo da descrição (não é substituído pelo catálogo). */
  note?: string;
  /** Seções próprias do produto, exibidas antes de "Como funciona o pagamento". */
  children?: ReactNode;
}

/** Recursos que são só limite de assentos — ficam nos cards de plano, não na lista geral. */
const SEAT_LIKE = /(profissionai?s?|usu[áa]rios?|colaboradores?)\b/i;

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
      if (SEAT_LIKE.test(f) && /\d|ilimitad/i.test(f)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

export function ProductPageLayout({ productKey, app, product, plans, fallback, contactOnly, note, children }: Props) {
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
  const inDevelopment = product?.status === "development";

  const handleCheckout = (priceId: string) => {
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <>
      {isOpen && CheckoutForm && (
        <CheckoutModal onClose={closeCheckout}>
          <CheckoutForm />
        </CheckoutModal>
      )}

      <section className="relative overflow-hidden">
        <ProductImage
          src={heroImage}
          sizes="100vw"
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
              {product && statusLabel(product.status)}
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
            {inDevelopment ? (
              <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
                <Link
                  to="/contato"
                  search={{ segmento: productKey }}
                  onClick={() => trackCTAClick({ section: "hero", label: "Entrar na lista de espera", destination: "/contato" })}
                >
                  Entrar na lista de espera <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
                <Link to="/contato" onClick={() => trackCTAClick({ section: "hero", label: "Solicitar Demo" })}>
                  Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            {!contactOnly && !inDevelopment && <AcessarSistemaButton app={app} size="lg" variant="heroOutline" />}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">O que o {name} faz</h2>
            <p className="mt-3 text-muted-foreground">{description}</p>
            {note && <p className="mt-3 text-sm text-muted-foreground">{note}</p>}
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
              {purchasable ? (
                <Button asChild className="mt-6 bg-cta text-cta-foreground hover:bg-cta/90">
                  <Link
                    to="/contato"
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
                  </Link>
                </Button>
              ) : (
                <Button asChild className="mt-6 bg-cta text-cta-foreground hover:bg-cta/90">
                  <Link
                    to="/contato"
                    search={{ segmento: productKey }}
                    onClick={() =>
                      trackCTAClick({
                        section: "pricing",
                        action: "lista-de-espera",
                        label: "Entrar na lista de espera",
                        destination: "/contato",
                      })
                    }
                  >
                    Entrar na lista de espera <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {children}

      {!(contactOnly && !purchasable) && <PaymentInfoSection />}
    </>
  );
}
