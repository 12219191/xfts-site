import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star } from "lucide-react";
import heroClinic from "@/assets/hero-clinic.jpg";
import { trackCTAClick, trackFormSubmit } from "@/lib/tracking";

export const Route = createFileRoute("/produtos/gestao-clinica")({
  head: () => ({
    meta: [
      { title: "Gestão Clínica - XFTS Inteligência Analítica" },
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

function GestaoClinicaPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <img src={heroClinic} alt="Clínica moderna com tecnologia" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">Gestão Clínica Completa</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">
            Sistema SaaS para otimizar agendamentos, prontuários e finanças da sua clínica.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">Acessar Sistema</Button></Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <ul className="mt-6 grid gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-foreground">
                  <Check className="h-5 w-5 shrink-0 text-cta" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Planos e Preços</h2>
            <div className="mt-6 grid gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-card-foreground">Básico</h3>
                  <p className="mt-1 text-3xl font-bold text-primary">R$ 99<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">Ideal para consultórios individuais</p>
                  <Link to="/contato"><Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">Começar Agora</Button></Link>
                </CardContent>
              </Card>
              <Card className="border-2 border-cta bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-card-foreground">Pro</h3>
                    <span className="rounded-full bg-cta/10 px-3 py-1 text-xs font-medium text-cta">Popular</span>
                  </div>
                  <p className="mt-1 text-3xl font-bold text-primary">R$ 199<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">Para clínicas com múltiplos profissionais</p>
                  <Link to="/contato"><Button className="mt-4 w-full bg-cta text-cta-foreground hover:bg-cta/90">Começar Agora</Button></Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="container-wide">
          <h2 className="text-center text-3xl font-bold text-foreground">O que dizem nossos clientes</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-1">{Array(5).fill(0).map((_, i) => <Star key={i} className="h-4 w-4 fill-cta text-cta" />)}</div>
                  <p className="mt-4 text-sm text-muted-foreground italic">"{t.text}"</p>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
