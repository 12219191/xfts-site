import { createFileRoute, Link } from "@tanstack/react-router";
import { useProductImage, useProductImageAlt, PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
const heroAesthetics = PRODUCT_IMAGE_DEFAULTS.estetica;
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import { productJsonLd } from "@/lib/product-schema";
import { esteticasPlans as fallbackPlans } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct } from "@/lib/catalog";
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";

export const Route = createFileRoute("/produtos/gestao-esteticas")({
  loader: async () => ({
    plans: plansForProduct(await getPublicCatalog(), "estetica"),
  }),
  head: ({ loaderData }) => ({
    meta: [
      { title: "FLEXUS | Estética - Gestão de Clínicas de Estética e Salões" },
      { name: "description", content: "Sistema SaaS para clínicas de estética e salões: estoque, PDV, pacotes e sessões, comissões e CRM. Planos a partir de R$ 99/mês." },
      { property: "og:title", content: "FLEXUS | Estética - Gestão de Clínicas de Estética e Salões" },
      { property: "og:description", content: "Estoque, PDV, pacotes, comissões e CRM para estética e salões. Planos a partir de R$ 99/mês." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://xfts-flexus.com/produtos/gestao-esteticas" },
      { name: "twitter:title", content: "FLEXUS | Estética - Gestão de Clínicas de Estética e Salões" },
      { name: "twitter:description", content: "Estoque, PDV, pacotes, comissões e CRM para estética e salões." },
    ],
    links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/gestao-esteticas" }],
    scripts: [
      productJsonLd({
        name: "FLEXUS | Estética",
        description: "Sistema SaaS de gestão para clínicas de estética e salões de beleza.",
        path: "/produtos/gestao-esteticas",
        plans: loaderData?.plans ?? fallbackPlans,
      }),
    ],
  }),
  component: GestaoEsteticasPage,
});

const features = [
  "Controle de estoque de produtos",
  "Gestão de vendas e PDV",
  "CRM e fidelização de clientes",
  "Agendamento online integrado",
  "Gestão de comissões por profissional",
  "Relatórios financeiros e analíticos",
  "Controle de pacotes e sessões",
  "Notificações automáticas",
];

const testimonials = [
  { name: "Juliana Costa", role: "Clínica de Estética", text: "O controle de pacotes e sessões é perfeito. Nenhuma sessão é esquecida e o cliente fica satisfeito." },
  { name: "Marina Souza", role: "Salão de Beleza", text: "A gestão de comissões simplificou nosso dia a dia. Cada profissional sabe exatamente quanto vai receber." },
  { name: "Fernanda Alves", role: "Studio de Beleza", text: "Os relatórios analíticos nos mostraram quais serviços dão mais lucro. Faturamento cresceu 25%." },
];


function GestaoEsteticasPage() {
  const { plans } = Route.useLoaderData();
  const heroAestheticsLive = useProductImage("estetica");
  const heroAestheticsLiveAlt = useProductImageAlt("estetica");
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const handleCheckout = (priceId: string, label: string) => {
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
            <button onClick={closeCheckout} className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            <CheckoutForm />
          </div>
        </div>
      )}

      <section className="relative overflow-hidden">
        <img src={heroAestheticsLive} alt={heroAestheticsLiveAlt} width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">FLEXUS | Estética e Bem-estar</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">Gestão completa para clínicas de estética e salões de beleza.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick({ section: "hero", label: "Solicitar Demo" })}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <AcessarSistemaButton app="estetica" size="lg" variant="heroOutline" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <p className="mt-3 text-muted-foreground">Tudo para gerenciar sua clínica de estética com excelência.</p>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                <Check className="h-5 w-5 shrink-0 text-primary" />{f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Planos e Preços</h2>
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal para sua clínica ou rede.</p>
          </div>
          <div className="mt-12">
            <PricingCards plans={plans} trackingSection="pricing" onCheckout={handleCheckout} compareProduct="estetica" productName="FLEXUS | Estética" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <h2 className="text-center text-3xl font-bold text-foreground">O que dizem nossos clientes</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border bg-card"><CardContent className="p-6">
                <div className="flex gap-1">{Array(5).fill(0).map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}</div>
                <p className="mt-4 text-sm text-muted-foreground italic">"{t.text}"</p>
                <div className="mt-4"><p className="text-sm font-semibold text-card-foreground">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
