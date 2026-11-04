import { CheckoutModal } from "@/components/CheckoutModal";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Minus, ArrowRight, HelpCircle, ChevronDown, Shield, X } from "lucide-react";
import { SEATS_BY_TIER, SEATS_BY_APP, seatsLabel } from "@/lib/flexus-apps";
import { trackCTAClick } from "@/lib/tracking";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase, siteCta } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { getTrialMessage, trialBadgeLabel } from "@/lib/trial-messaging";
import { planComparisonFaqs } from "@/lib/commercial-faq";
import { catalogComparisonFeatures } from "@/lib/catalog-comparison";
import type { ProductPlan as CatalogProductPlan } from "@/lib/product-plans";


const PRODUCT_KEYS = ["clinica", "barbearia", "estetica", "aba", "crm", "casa360", "atende", "flow"] as const;
type ProductKey = (typeof PRODUCT_KEYS)[number];

export const Route = createFileRoute("/produtos/comparar-planos")({
  validateSearch: (search: Record<string, unknown>): { produto?: ProductKey } => {
    const produto = search.produto as ProductKey;
    return PRODUCT_KEYS.includes(produto) ? { produto } : {};
  },
  loader: async () => {
    const snapshot = await getPublicCatalog();
    const plansByProduct: Record<string, CatalogProductPlan[]> = {};
    const availability: Record<string, { buyable: boolean; badge: string | null }> = {};
    for (const key of PRODUCT_KEYS) {
      plansByProduct[key] = plansForProduct(snapshot, key);
      const entry = snapshot.products.find((p) => p.key === key);
      availability[key] = entry
        ? { buyable: canPurchase(entry) && plansByProduct[key].length > 0, badge: siteCta(entry).badge }
        : { buyable: false, badge: null };
    }
    return { plansByProduct, availability };
  },
  head: () => ({
    meta: [
      { title: "Comparar Planos - XFTS Inteligência Analítica" },
      { name: "description", content: "Compare os planos Básico, Pro e Enterprise de cada sistema FLEXUS. Escolha o ideal para o seu negócio." },
      { property: "og:title", content: "Comparar Planos - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Compare os planos Básico, Pro e Enterprise de cada sistema FLEXUS." },
    ],
  }),
  component: CompararPlanosPage,
});

type FeatureValue = boolean | string;

interface PlanFeature {
  name: string;
  tooltip?: string;
  basico: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

interface ProductPlan {
  key: ProductKey;
  product: string;
  slug: string;
  /** Tiers do catálogo por coluna (padrão basico/pro/enterprise). */
  tiers?: { basico: string; pro: string; enterprise: string };
  labels?: { basico: string; pro: string; enterprise: string };
  /** Usa as colunas do catálogo para usuários e permite checkout nas três colunas. */
  allTiersOnline?: boolean;
}

type Column = "basico" | "pro" | "enterprise";

const products: ProductPlan[] = [
  {
    key: "clinica",
    product: "FLEXUS | Clínica",
    slug: "/produtos/gestao-clinica",
  },
  {
    key: "barbearia",
    product: "FLEXUS | Barbearia",
    slug: "/produtos/gestao-barbearias",
  },
  {
    key: "estetica",
    product: "FLEXUS | Estética",
    slug: "/produtos/gestao-esteticas",
  },
  {
    key: "aba",
    product: "FLEXUS | ABA",
    slug: "/produtos/flexus-aba",
  },
  {
    key: "crm",
    product: "FLEXUS | CRM",
    slug: "/produtos/flexus-crm",
  },
  {
    key: "casa360",
    product: "FLEXUS | Casa360°",
    slug: "/produtos/flexus-casa360",
  },
];

products.push({
  key: "atende",
  product: "FLEXUS | Atende",
  slug: "/produtos/flexus-atende",
  tiers: { basico: "basic", pro: "standard", enterprise: "corporate" },
  labels: { basico: "Basic", pro: "Standard", enterprise: "Corporate" },
  allTiersOnline: true,
});

products.push({
  key: "flow",
  product: "FLEXUS | Flow",
  slug: "/produtos/flexus-flow",
  tiers: { basico: "start", pro: "pro", enterprise: "business" },
  labels: { basico: "Start", pro: "Pro", enterprise: "Business" },
  allTiersOnline: true,
});

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-primary" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-muted-foreground/30" />;
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}


function CompararPlanosPage() {
  const { produto } = Route.useSearch();
  const { plansByProduct, availability } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const isBuyable = (key: ProductKey) => availability[key]?.buyable ?? false;
  const selected =
    products.find((p) => p.key === produto) ??
    products.find((p) => isBuyable(p.key)) ??
    products[0];
  const selectedBuyable = isBuyable(selected.key);
  const selectedTrial = getTrialMessage(plansByProduct[selected.key] ?? [], selectedBuyable);
  const [annual, setAnnual] = useState(false);
  /** Preços (lookup keys) das assinaturas ativas do visitante logado. */
  const [myPriceIds, setMyPriceIds] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const env = getStripeEnvironment() === "live" ? "live" : "sandbox";
      const { data } = await supabase
        .from("subscriptions")
        .select("price_id, status")
        .eq("user_id", session.user.id)
        .or(`environment.eq.${env},is_courtesy.is.true`)
        .in("status", ["active", "trialing", "past_due"]);
      if (!cancelled) setMyPriceIds((data ?? []).map((r) => r.price_id));
    })();
    return () => { cancelled = true; };
  }, []);
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();


  /** Preços exclusivamente do catálogo oficial. */
  const tierOf = (productKey: ProductKey, col: Column) =>
    products.find((p) => p.key === productKey)?.tiers?.[col] ?? col;
  const catalogPlan = (productKey: ProductKey, col: Column) =>
    plansByProduct[productKey]?.find((p) => p.tier === tierOf(productKey, col));
  const isMyPlan = (productKey: ProductKey, col: Column) => {
    const plan = catalogPlan(productKey, col);
    if (!plan) return false;
    return myPriceIds.some((id) => id === plan.priceId || id === plan.annualPriceId);
  };
  const MyPlanBadge = ({ col }: { col: Column }) => (
    <div className="mt-2 flex flex-col items-center gap-1">
      {isMyPlan(selected.key, col) && <Badge variant="secondary">Seu plano atual</Badge>}
      {priceIdFor(selected.key, col) && trialBadgeLabel(catalogPlan(selected.key, col) ?? {}) && (
        <span className="text-xs font-medium text-primary">
          {trialBadgeLabel(catalogPlan(selected.key, col) ?? {})}
        </span>
      )}
    </div>
  );
  const shownPrice = (productKey: ProductKey, col: Column) => {
    const plan = catalogPlan(productKey, col);
    if (!plan) return "Sob consulta";
    if (annual) {
      if (!plan.annualPrice || !plan.annualPriceId) return "Sob consulta";
      const cents = Number(plan.annualPrice.replace(/[^\d,]/g, "").replace(",", "."));
      return cents > 0 ? `R$ ${(cents / 12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Sob consulta";
    }
    return plan.priceId ? plan.price : "Sob consulta";
  };

  /** Mesma fonte que o hub: assentos do catálogo; depois limites por app e por tier. */
  const TIER_NAME: Record<Column, string> = { basico: "Básico", pro: "Pro", enterprise: "Enterprise" };
  const seatsFor = (productKey: ProductKey, col: Column): number | null => {
    const fromCatalog = catalogPlan(productKey, col)?.seats;
    if (typeof fromCatalog === "number") return fromCatalog;
    if (products.find((p) => p.key === productKey)?.allTiersOnline) return null;
    const tier = TIER_NAME[col];
    const perApp = (SEATS_BY_APP as Record<string, Record<string, number | null> | undefined>)[productKey];
    if (perApp && tier in perApp) return perApp[tier] ?? null;
    return tier in SEATS_BY_TIER ? SEATS_BY_TIER[tier] ?? null : 2;
  };

  const priceOf = (productKey: ProductKey, tier: Column) => catalogPlan(productKey, tier)?.price ?? "Sob consulta";

  const priceIdFor = (productKey: ProductKey, tier: Column) => {
    if (!isBuyable(productKey)) return undefined;
    const plan = catalogPlan(productKey, tier);
    if (!plan) return undefined;
    return annual ? (plan.annualPrice && plan.annualPriceId ? plan.annualPriceId : undefined) : plan.priceId;
  };

  const startCheckout = (productKey: ProductKey, tier: Column, section: string, label: string) => {
    const priceId = priceIdFor(productKey, tier);
    if (!priceId) return;
    trackCTAClick({ section, label, destination: "/checkout" });
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <TooltipProvider>
      {isOpen && CheckoutForm && (
        <CheckoutModal onClose={closeCheckout}>
          <CheckoutForm />
        </CheckoutModal>
      )}

      <section className="section-padding">
        <div className="container-wide px-4">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">Planos & Preços</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Escolha o plano ideal
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Compare os planos de cada sistema FLEXUS. Consulte preços, recursos e condições de teste de cada plano.
            </p>

            {/* Seletor de sistema */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {products.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={selected.key === p.key}
                  onClick={() => navigate({ search: { produto: p.key } })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    selected.key === p.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.product}
                  {availability[p.key]?.badge && (
                    <Badge variant="secondary" className="ml-2">{availability[p.key]?.badge}</Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Toggle Mensal / Anual */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1.5 shadow-sm">
              <button
                type="button"
                aria-pressed={!annual}
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${!annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensal
              </button>
              <button
                type="button"
                aria-pressed={annual}
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual
                
              </button>
            </div>
          </div>

          {/* Produto selecionado */}
          {[selected].map((product) => (
            <div key={product.key} className="mt-16">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{product.product}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Compare funcionalidades lado a lado</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={product.slug as any} onClick={() => trackCTAClick({ section: `planos-${product.product}`, label: "Ver produto" })}>
                    Ver produto <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {!selectedBuyable && (
                <div role="note" className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    {product.product} ainda não está disponível para contratação; os valores estão sob consulta.
                  </p>
                  <Button asChild size="sm" className="shrink-0 bg-cta text-cta-foreground hover:bg-cta/90">
                    <Link
                      to="/contato"
                      search={{ segmento: product.key }}
                      onClick={() => trackCTAClick({ section: `planos-${product.product}`, label: "Avise-me quando lançar", destination: "/contato" })}
                    >
                      Avise-me quando lançar
                    </Link>
                  </Button>
                </div>
              )}

              {/* Comparison Table */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-sm font-semibold text-foreground">Funcionalidade</th>
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-center">
                        <div className="text-sm font-semibold text-foreground">{product.labels?.basico ?? "Básico"}</div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{shownPrice(product.key, "basico")}<span className="text-xs font-normal text-muted-foreground">{shownPrice(product.key, "basico") === "Sob consulta" ? "" : "/mês"}</span></div>
                        {annual && priceIdFor(product.key, "basico") && <div className="mt-0.5 text-xs text-muted-foreground line-through">{priceOf(product.key, "basico")}/mês</div>}
                        <MyPlanBadge col="basico" />
                      </th>
                      <th className="sticky top-0 z-10 border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{product.labels?.pro ?? "Pro"}</span>
                          <span className="rounded-full bg-cta px-2.5 py-0.5 text-[10px] font-bold text-cta-foreground uppercase tracking-wide">Mais Popular</span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{shownPrice(product.key, "pro")}<span className="text-xs font-normal text-muted-foreground">{shownPrice(product.key, "pro") === "Sob consulta" ? "" : "/mês"}</span></div>
                        {annual && priceIdFor(product.key, "pro") && <div className="mt-0.5 text-xs text-muted-foreground line-through">{priceOf(product.key, "pro")}/mês</div>}
                        <MyPlanBadge col="pro" />
                      </th>
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{product.labels?.enterprise ?? "Enterprise"}</span>
                          <span className="rounded-full bg-gradient-to-r from-gold to-gold-deep px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground uppercase tracking-wide">Premium</span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{shownPrice(product.key, "enterprise")}<span className="text-xs font-normal text-muted-foreground">{shownPrice(product.key, "enterprise") === "Sob consulta" ? "" : "/mês"}</span></div>
                        {annual && priceIdFor(product.key, "enterprise") && <div className="mt-0.5 text-xs text-muted-foreground line-through">{priceOf(product.key, "enterprise")}/mês</div>}
                        <MyPlanBadge col="enterprise" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        name: "Usuários inclusos",
                        tooltip:
                          "Quantidade de pessoas da equipe que o titular pode convidar dentro do sistema. Clientes finais que acessam o portal por link não contam.",
                        basico: seatsLabel(seatsFor(product.key, "basico")),
                        pro: seatsLabel(seatsFor(product.key, "pro")),
                        enterprise: seatsLabel(seatsFor(product.key, "enterprise")),
                      } as PlanFeature,
                      ...catalogComparisonFeatures({
                        basico: catalogPlan(product.key, "basico"),
                        pro: catalogPlan(product.key, "pro"),
                        enterprise: catalogPlan(product.key, "enterprise"),
                      }),
                    ].map((feature, idx) => (

                      <tr key={feature.name} className={`border-b border-border/50 last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-6 py-3.5 text-sm text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            {feature.name}
                            {"tooltip" in feature && feature.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px]">
                                  <p>{"tooltip" in feature ? feature.tooltip : null}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center"><FeatureCell value={feature.basico} /></td>
                        <td className="border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-3.5 text-center"><FeatureCell value={feature.pro} /></td>
                        <td className="px-6 py-3.5 text-center"><FeatureCell value={feature.enterprise} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {!selectedBuyable ? (
                    <tr className="border-t border-border">
                      <td className="px-6 py-5" />
                      {(["basico", "pro", "enterprise"] as const).map((col) => (
                        <td key={col} className="px-6 py-5 text-center">
                          <Button type="button" variant="outline" className="w-full" disabled>
                            Em breve
                          </Button>
                        </td>
                      ))}
                    </tr>
                    ) : (
                    <tr className="border-t border-border">
                      <td className="px-6 py-5" />
                      <td className="px-6 py-5 text-center">
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={!priceIdFor(product.key, "basico")}
                           onClick={() => startCheckout(product.key, "basico", `planos-${product.product}`, "Começar - Básico")}
                        >
                          Começar
                        </Button>
                      </td>
                      <td className="border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-5 text-center">
                        <Button
                          className="w-full bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/20"
                          disabled={!priceIdFor(product.key, "pro")}
                           onClick={() => startCheckout(product.key, "pro", `planos-${product.product}`, "Começar - Pro")}
                        >
                          Começar Agora
                        </Button>
                      </td>

                      <td className="px-6 py-5 text-center">
                        {product.allTiersOnline && priceIdFor(product.key, "enterprise") ? (
                          <Button
                            className="w-full bg-gradient-to-r from-gold to-gold-deep text-gold-foreground hover:from-gold-deep hover:to-gold-deep shadow-lg shadow-gold-deep/20"
                            onClick={() => startCheckout(product.key, "enterprise", `planos-${product.product}`, `Começar - ${product.labels?.enterprise ?? "Enterprise"}`)}
                          >
                            Começar Agora
                          </Button>
                        ) : (
                        <Button asChild className="w-full bg-gradient-to-r from-gold to-gold-deep text-gold-foreground hover:from-gold-deep hover:to-gold-deep shadow-lg shadow-gold-deep/20">
                          <Link to="/contato" onClick={() => trackCTAClick({ section: `planos-${product.product}`, label: "Falar com Consultor" })}>
                            Falar com Consultor
                          </Link>
                        </Button>
                        )}
                      </td>
                    </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Guarantee */}
          <div className="mx-auto mt-16 flex max-w-md items-center gap-4 rounded-2xl border border-cta/20 bg-primary/5 p-6">
            <Shield className="h-10 w-10 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">{selectedTrial?.heading ?? "Condições de contratação"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{selectedTrial?.detail ?? "Consulte as condições de contratação de cada plano."}</p>
              {selectedTrial && <p className="mt-2 text-xs text-muted-foreground">{selectedTrial.footnote}</p>}
            </div>
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-2xl">
            <h3 className="text-center text-2xl font-bold text-foreground">Perguntas Frequentes</h3>
            <div className="mt-8 space-y-3">
              {planComparisonFaqs.map((faq) => (
                <Collapsible key={faq.q}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    {faq.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">
                    <p>{faq.a}</p>
                    {"links" in faq && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {faq.links.map((link) => (
                          <Link key={link.href} to={link.href} className="text-primary underline underline-offset-4 hover:text-primary/80">
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 text-center shadow-xl">
            <h3 className="text-2xl font-bold text-primary-foreground">Não tem certeza qual plano escolher?</h3>
            <p className="mt-3 text-primary-foreground/80">Nossa equipe pode ajudar a encontrar a solução perfeita para o seu negócio.</p>
            <Button asChild size="lg" className="mt-6 bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/30">
              <Link to="/contato" onClick={() => trackCTAClick({ section: "cta-final", label: "Falar com Especialista" })}>
                Falar com Especialista <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
