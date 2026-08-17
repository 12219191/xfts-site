import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import heroClinicAsset from "@/assets/hero-clinic.webp.asset.json";
const heroClinic = heroClinicAsset.url;
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";

export const Route = createFileRoute("/produtos/gestao-clinica")({
  head: () => ({
    meta: [
      { title: "FLEXUS | Clínica - XFTS Inteligência Analítica" },
      { name: "description", content: "Sistema SaaS completo para gestão de consultórios e clínicas. Agendamentos, prontuários e finanças." },
    ],
  }),
  component: GestaoClinicaPage,
});

const features = [
  "Agendamento online inteligente",
  "Prontuário eletrônico completo",
  "Controle financeiro integrado",
  "Relatórios e dashboards analíticos",
  "Gestão de equipe e profissionais",
  "Notificações automáticas para pacientes",
  "Emissão de recibos e notas",
  "Integração com convênios",
];

const testimonials = [
  { name: "Dra. Ana Silva", role: "Clínica Odontológica", text: "O sistema transformou a gestão da nossa clínica. Reduzimos faltas em 40% com os lembretes automáticos." },
  { name: "Dr. Carlos Mendes", role: "Consultório Médico", text: "Finalmente um sistema que entende as necessidades de uma clínica. Prontuário eletrônico excelente." },
  { name: "Dra. Patrícia Lima", role: "Clínica de Harmonização", text: "A inteligência analítica nos ajudou a identificar os melhores horários e serviços. Faturamento cresceu 30%." },
];

const plans = [
  {
    name: "Básico", price: "R$ 99", description: "Ideal para consultórios individuais", tier: "basico" as const,
    features: ["Agendamento online", "Prontuário eletrônico", "Controle financeiro", "Emissão de recibos", "1 profissional"],
    priceId: "gestao_clinica_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para clínicas com múltiplos profissionais", tier: "pro" as const,
    features: ["Tudo do Básico", "Notificações automáticas", "Relatórios avançados", "Gestão de equipe", "Até 10 profissionais"],
    priceId: "gestao_clinica_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para redes e grandes operações", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Multi-unidades", "Integração com convênios", "API e integrações", "Profissionais ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

function GestaoClinicaPage() {
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const handleCheckout = (priceId: string, label: string) => {
    trackCTAClick(label, "gestao-clinica-pricing");
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
        <img src={heroClinic} alt="Clínica moderna com tecnologia" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">FLEXUS | Clínica Completo</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">Sistema SaaS para otimizar agendamentos, prontuários e finanças da sua clínica.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Solicitar Demo", "gestao-clinica-hero")}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <AcessarSistemaButton app="clinica" size="lg" variant="heroOutline" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <p className="mt-3 text-muted-foreground">Tudo que você precisa para gerenciar sua clínica com excelência.</p>
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
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal para o seu consultório ou clínica.</p>
          </div>
          <div className="mt-12">
            <PricingCards plans={plans} trackingSection="gestao-clinica-pricing" onCheckout={handleCheckout} compareProduct="clinica" productName="FLEXUS | Clínica" />
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
