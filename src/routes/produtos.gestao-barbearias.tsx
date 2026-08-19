import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import heroBarbershopAsset from "@/assets/hero-barbershop.webp.asset.json";
const heroBarbershop = heroBarbershopAssetAsset.url;
const PRODUCT_SLUG = "barbearia" as const;
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";
import { productJsonLd } from "@/lib/product-schema";
import { barbeariasPlans as plans } from "@/lib/product-plans";

export const Route = createFileRoute("/produtos/gestao-barbearias")({
  head: () => ({
    meta: [
      { title: "FLEXUS | Barbearia - Gestão de Barbearias e Salões" },
      { name: "description", content: "Sistema SaaS para barbearias e salões: PDV, estoque, agendamento online, comissões e CRM. Planos a partir de R$ 89/mês." },
      { property: "og:title", content: "FLEXUS | Barbearia - Gestão de Barbearias e Salões" },
      { property: "og:description", content: "PDV, estoque, agendamento, comissões e CRM para barbearias. Planos a partir de R$ 89/mês." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://xfts-flexus.com/produtos/gestao-barbearias" },
      { property: "og:image", content: heroBarbershop },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FLEXUS | Barbearia - Gestão de Barbearias e Salões" },
      { name: "twitter:description", content: "PDV, estoque, agendamento, comissões e CRM para barbearias." },
      { name: "twitter:image", content: heroBarbershop },
    ],
    links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/gestao-barbearias" }],
    scripts: [
      productJsonLd({
        name: "FLEXUS | Barbearia",
        description: "Sistema SaaS de gestão para barbearias e salões masculinos.",
        path: "/produtos/gestao-barbearias",
        image: heroBarbershop,
        plans,
      }),
    ],
  }),
  component: GestaoBarbeariasPage,
});

const features = [
  "Controle de estoque inteligente",
  "PDV integrado com vendas",
  "CRM e fidelização de clientes",
  "Agendamento online",
  "Gestão de comissões",
  "Relatórios de performance",
  "Controle de caixa",
  "Notificações por WhatsApp",
];

const testimonials = [
  { name: "Lucas Ferreira", role: "Barbearia Premium", text: "O controle de estoque e PDV mudaram nosso jogo. Não perdemos mais produtos e o caixa fecha certinho." },
  { name: "Rafael Santos", role: "Salão Masculino", text: "O CRM nos ajudou a fidelizar clientes. Taxa de retorno aumentou 50% em 3 meses." },
  { name: "André Oliveira", role: "Rede de Barbearias", text: "Gerenciar 5 unidades ficou simples com os dashboards analíticos. Recomendo demais." },
];


function GestaoBarbeariasPage() {
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const handleCheckout = (priceId: string, label: string) => {
    trackCTAClick(label, "gestao-barbearias-pricing");
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
        <img src={heroBarbershop} alt="Barbearia moderna" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">FLEXUS | Barbearia e Salões</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">Estoque, vendas, PDV e CRM em uma única plataforma inteligente.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Solicitar Demo", "gestao-barbearias-hero")}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <AcessarSistemaButton app="barbearia" size="lg" variant="heroOutline" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <p className="mt-3 text-muted-foreground">Tudo para gerenciar sua barbearia com eficiência e praticidade.</p>
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
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal para sua barbearia ou rede.</p>
          </div>
          <div className="mt-12">
            <PricingCards plans={plans} trackingSection="gestao-barbearias-pricing" onCheckout={handleCheckout} compareProduct="barbearia" productName="FLEXUS | Barbearia" />
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
