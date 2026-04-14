import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star } from "lucide-react";
import heroAesthetics from "@/assets/hero-aesthetics.jpg";
import { trackCTAClick, trackFormSubmit } from "@/lib/tracking";

export const Route = createFileRoute("/produtos/gestao-esteticas")({
  head: () => ({
    meta: [
      { title: "Gestão de Estéticas e Salões - XFTS Inteligência Analítica" },
      { name: "description", content: "Sistema SaaS para clínicas de estética e salões de beleza. Estoque, vendas e CRM." },
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
  return (
    <>
      <section className="relative overflow-hidden">
        <img src={heroAesthetics} alt="Clínica de estética moderna" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">Estoque, Vendas e CRM para Estéticas</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">Gestão completa para clínicas de estética e salões de beleza.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Solicitar Demo", "gestao-esteticas-hero")}>Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => trackCTAClick("Acessar Sistema", "gestao-esteticas-hero")}>Acessar Sistema</Button></Link>
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
                <p className="mt-1 text-3xl font-bold text-primary">R$ 99<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">Para studios individuais</p>
                <Link to="/contato"><Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => trackCTAClick("Começar Agora - Básico", "gestao-esteticas-pricing")}>Começar Agora</Button></Link>
              </CardContent></Card>
              <Card className="border-2 border-cta bg-card"><CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-card-foreground">Pro</h3>
                  <span className="rounded-full bg-cta/10 px-3 py-1 text-xs font-medium text-cta">Popular</span>
                </div>
                <p className="mt-1 text-3xl font-bold text-primary">R$ 189<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">Para clínicas com equipe</p>
                <Link to="/contato"><Button className="mt-4 w-full bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Começar Agora - Pro", "gestao-esteticas-pricing")}>Começar Agora</Button></Link>
              </CardContent></Card>
              <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-card to-amber-500/5"><CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-card-foreground">Enterprise</h3>
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">Premium</span>
                </div>
                <p className="mt-1 text-3xl font-bold text-primary">R$ 379<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                <p className="mt-2 text-sm text-muted-foreground">Para redes e grandes operações</p>
                <Link to="/contato"><Button className="mt-4 w-full bg-amber-600 text-white hover:bg-amber-700" onClick={() => trackCTAClick("Começar Agora - Enterprise", "gestao-esteticas-pricing")}>Falar com Consultor</Button></Link>
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
