import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import heroAbaAsset from "@/assets/hero-aba.webp.asset.json";
const heroAba = heroAbaAsset.url;
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";

export const Route = createFileRoute("/produtos/flexus-aba")({
  head: () => ({
    meta: [
      { title: "FLEXUS | ABA - Sistema para Clínicas de Análise do Comportamento" },
      { name: "description", content: "Sistema SaaS para clínicas ABA / TEA: registro de tentativas, PTI, gráficos de evolução e relatórios para convênios." },
      { property: "og:title", content: "FLEXUS | ABA - Sistema para Clínicas de Análise do Comportamento" },
      { property: "og:description", content: "Sistema SaaS para clínicas ABA / TEA: registro de tentativas, PTI, gráficos de evolução e relatórios para convênios." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "/produtos/flexus-aba" },
      { property: "og:image", content: heroAba },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroAba },
    ],
    links: [
      { rel: "canonical", href: "/produtos/flexus-aba" },
    ],
  }),
  component: FlexusAbaPage,
});

const features = [
  "Registro de tentativas (DTT) em tempo real",
  "Programas de intervenção personalizados",
  "Gráficos de evolução por objetivo",
  "Plano terapêutico individualizado (PTI)",
  "Agenda de sessões e supervisões",
  "Prontuário multidisciplinar",
  "Relatórios para responsáveis e convênios",
  "Controle de horas autorizadas",
];

const testimonials = [
  { name: "Marina Costa, BCBA", role: "Clínica ABA Conexão", text: "Reduzimos em 60% o tempo de preparação de relatórios para convênios. A coleta de dados ficou muito mais consistente." },
  { name: "Dr. Rafael Souza", role: "Supervisor Clínico", text: "Os gráficos de evolução por objetivo facilitam imensamente o acompanhamento do progresso de cada criança." },
  { name: "Juliana Reis", role: "Coordenadora ABA Vida", text: "Toda a equipe trabalha alinhada. O controle de horas autorizadas evitou retrabalho com convênios." },
];

const plans = [
  {
    name: "Básico", price: "R$ 99", description: "Ideal para terapeutas autônomos", tier: "basico" as const,
    features: ["Registro de tentativas", "Agenda de sessões", "Prontuário básico", "Relatórios mensais", "1 profissional"],
    priceId: "flexus_aba_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para clínicas em crescimento", tier: "pro" as const,
    features: ["Tudo do Básico", "Gráficos de evolução", "PTI completo", "Controle de horas autorizadas", "Até 10 profissionais"],
    priceId: "flexus_aba_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para redes e grandes clínicas", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Multi-unidades", "Integração com convênios", "API e integrações", "Profissionais ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

function FlexusAbaPage() {
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const handleCheckout = (priceId: string, label: string) => {
    trackCTAClick(label, "flexus-aba-pricing");
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
        <img src={heroAba} alt="Sala de terapia ABA com materiais lúdicos" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">FLEXUS | ABA</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">Sistema SaaS para clínicas de Análise do Comportamento Aplicada. Coleta de dados, evolução e relatórios sem complicação.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Solicitar Demo", "flexus-aba-hero")}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <AcessarSistemaButton app="aba" size="lg" variant="heroOutline" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <p className="mt-3 text-muted-foreground">Tudo que sua clínica ABA precisa para focar no que realmente importa: a evolução dos pacientes.</p>
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
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal para a sua clínica ABA.</p>
          </div>
          <div className="mt-12">
            <PricingCards plans={plans} trackingSection="flexus-aba-pricing" onCheckout={handleCheckout} compareProduct="aba" productName="FLEXUS | ABA" />
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
