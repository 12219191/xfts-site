import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import heroCrm from "@/assets/hero-crm.jpg";
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PricingCards } from "@/components/PricingCards";

export const Route = createFileRoute("/produtos/flexus-crm")({
  head: () => ({
    meta: [
      { title: "FLEXUS | CRM - CRM de Vendas Multi-segmento" },
      { name: "description", content: "CRM SaaS de vendas com pipeline kanban, automações de follow-up, WhatsApp integrado e relatórios de conversão em tempo real." },
      { property: "og:title", content: "FLEXUS | CRM - CRM de Vendas Multi-segmento" },
      { property: "og:description", content: "CRM SaaS de vendas com pipeline kanban, automações de follow-up, WhatsApp integrado e relatórios de conversão em tempo real." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "/produtos/flexus-crm" },
      { property: "og:image", content: heroCrm },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroCrm },
    ],
    links: [
      { rel: "canonical", href: "/produtos/flexus-crm" },
    ],
  }),
  component: FlexusCrmPage,
});

const features = [
  "Pipeline de vendas em kanban",
  "Gestão de leads e oportunidades",
  "Automações de follow-up",
  "Integração com e-mail e WhatsApp",
  "Funil de vendas customizável",
  "Relatórios de conversão e metas",
  "Importação de contatos e formulários",
  "App mobile para vendedores em campo",
];

const testimonials = [
  { name: "Pedro Almeida", role: "Diretor Comercial - TechSales", text: "Aumentamos em 45% a taxa de conversão no primeiro trimestre. As automações economizam horas todos os dias." },
  { name: "Beatriz Nunes", role: "Gerente de Vendas - ImobMaster", text: "Finalmente um CRM que nossos vendedores adoram usar. O app mobile é fantástico para visitas externas." },
  { name: "Lucas Ferreira", role: "CEO - Agência Digital Up", text: "Conseguimos visualizar o pipeline completo e identificar gargalos rapidamente. Decisões muito mais rápidas." },
];

const plans = [
  {
    name: "Básico", price: "R$ 99", description: "Para times pequenos começando", tier: "basico" as const,
    features: ["Pipeline kanban", "Gestão de leads", "Importação de contatos", "Relatórios básicos", "Até 3 usuários"],
    priceId: "flexus_crm_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para equipes em escala", tier: "pro" as const,
    features: ["Tudo do Básico", "Automações de follow-up", "WhatsApp integrado", "Funil customizável", "Até 15 usuários"],
    priceId: "flexus_crm_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para grandes operações comerciais", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Múltiplas equipes", "Relatórios avançados", "API e integrações", "Usuários ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

function FlexusCrmPage() {
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const handleCheckout = (priceId: string, label: string) => {
    trackCTAClick(label, "flexus-crm-pricing");
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
        <img src={heroCrm} alt="Equipe de vendas analisando dashboards e pipeline" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">FLEXUS | CRM</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">CRM completo para vender mais e melhor. Pipeline visual, automações e relatórios em tempo real.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Solicitar Demo", "flexus-crm-hero")}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => trackCTAClick("Acessar Sistema", "flexus-crm-hero")}>Acessar Sistema</Button></Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <p className="mt-3 text-muted-foreground">Tudo que seu time comercial precisa para fechar mais negócios em menos tempo.</p>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                <Check className="h-5 w-5 shrink-0 text-cta" />{f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Planos e Preços</h2>
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal para o seu time de vendas.</p>
          </div>
          <div className="mt-12">
            <PricingCards plans={plans} trackingSection="flexus-crm-pricing" onCheckout={handleCheckout} />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <h2 className="text-center text-3xl font-bold text-foreground">O que dizem nossos clientes</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border bg-card"><CardContent className="p-6">
                <div className="flex gap-1">{Array(5).fill(0).map((_, i) => <Star key={i} className="h-4 w-4 fill-cta text-cta" />)}</div>
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
