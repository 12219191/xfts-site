import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import heroBarbershop from "@/assets/hero-barbershop.jpg";
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

export const Route = createFileRoute("/produtos/gestao-barbearias")({
  head: () => ({
    meta: [
      { title: "Gestão de Barbearias - XFTS Inteligência Analítica" },
      { name: "description", content: "Sistema SaaS para barbearias e salões. Controle estoque, vendas, PDV e CRM." },
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
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">Gestão para Barbearias e Salões</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">Estoque, vendas, PDV e CRM em uma única plataforma inteligente.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Solicitar Demo", "gestao-barbearias-hero")}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => trackCTAClick("Acessar Sistema", "gestao-barbearias-hero")}>Acessar Sistema</Button></Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <ul className="mt-6 grid gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-foreground"><Check className="h-5 w-5 shrink-0 text-cta" /><span>{f}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Planos e Preços</h2>
            <div className="mt-6 grid gap-4">
              <Card className="border-border bg-card"><CardContent className="p-6">
                <h3 className="text-lg font-semibold text-card-foreground">Básico</h3>
                <p className="mt-1 text-3xl font-bold text-primary">R$ 89<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">Para barbearias individuais</p>
                <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => handleCheckout("gestao_barbearias_basico_mensal", "Começar Agora - Básico")}>Começar Agora</Button>
              </CardContent></Card>
              <Card className="border-2 border-cta bg-card"><CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-card-foreground">Pro</h3>
                  <span className="rounded-full bg-cta/10 px-3 py-1 text-xs font-medium text-cta">Popular</span>
                </div>
                <p className="mt-1 text-3xl font-bold text-primary">R$ 169<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">Para redes e múltiplas unidades</p>
                <Button className="mt-4 w-full bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => handleCheckout("gestao_barbearias_pro_mensal", "Começar Agora - Pro")}>Começar Agora</Button>
              </CardContent></Card>
              <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-card to-amber-500/5"><CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-card-foreground">Enterprise</h3>
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">Premium</span>
                </div>
                <p className="mt-1 text-3xl font-bold text-primary">R$ 349<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">Para redes e grandes operações</p>
                <Link to="/contato"><Button className="mt-4 w-full bg-amber-600 text-white hover:bg-amber-700" onClick={() => trackCTAClick("Começar Agora - Enterprise", "gestao-barbearias-pricing")}>Falar com Consultor</Button></Link>
              </CardContent></Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
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
