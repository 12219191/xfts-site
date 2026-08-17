import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, BarChart3, Shield, Zap, Stethoscope, Scissors, Sparkles, Brain, TrendingUp, House } from "lucide-react";
import { useState } from "react";
import { sendToZapier } from "@/lib/zapier";
import { trackCTAClick, trackProductClick, trackFormSubmit } from "@/lib/tracking";
import { ZapierSettings } from "@/components/ZapierSettings";
import heroMain from "@/assets/hero-main.jpg";
import heroClinicAsset from "@/assets/hero-clinic.webp.asset.json";
const heroClinic = heroClinicAsset.url;
import heroBarbershopAsset from "@/assets/hero-barbershop.webp.asset.json";
const heroBarbershop = heroBarbershopAsset.url;
import heroAesthetics from "@/assets/hero-aesthetics.jpg";
import heroAba from "@/assets/hero-aba.jpg";
import heroCrmAsset from "@/assets/hero-crm.webp.asset.json";
const heroCrm = heroCrmAsset.url;
import heroCasa360Asset from "@/assets/hero-casa360.webp.asset.json";
const heroCasa360 = heroCasa360Asset.url;
import { Logo } from "@/components/Logo";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XFTS Inteligência Analítica - Soluções SaaS de Gestão Inteligente" },
      { name: "description", content: "FLEXUS | Clínica, Barbearia, Estética, ABA e CRM com Inteligência Analítica. Solicite uma demo grátis." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [formData, setFormData] = useState({ nome: "", email: "", telefone: "", segmento: "" });
  const [sending, setSending] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const result = await sendToZapier(formData, "demo");
    if (result.success) {
      trackFormSubmit("demo", formData.segmento);
      setFormData({ nome: "", email: "", telefone: "", segmento: "" });
    }
    alert(result.message);
    setSending(false);
  };

  const products = [
    {
      icon: Stethoscope,
      title: "FLEXUS | Clínica",
      desc: "Sistema completo para gestão de consultórios e clínicas, otimizando agendamentos, prontuários e finanças.",
      image: heroClinic,
      link: "/produtos/gestao-clinica" as const,
    },
    {
      icon: Scissors,
      title: "FLEXUS | Barbearia",
      desc: "Solução para controle de estoque, vendas, PDV e relacionamento com cliente para barbearias e salões.",
      image: heroBarbershop,
      link: "/produtos/gestao-barbearias" as const,
    },
    {
      icon: Sparkles,
      title: "FLEXUS | Estética",
      desc: "Estoque, vendas e CRM para clínicas de estética e salões de beleza com inteligência analítica.",
      image: heroAesthetics,
      link: "/produtos/gestao-esteticas" as const,
    },
    {
      icon: Brain,
      title: "FLEXUS | ABA",
      desc: "Sistema completo para clínicas de Análise do Comportamento Aplicada (ABA / TEA): coleta de dados, evolução e relatórios.",
      image: heroAba,
      link: "/produtos/flexus-aba" as const,
    },
    {
      icon: TrendingUp,
      title: "FLEXUS | CRM",
      desc: "CRM de vendas multi-segmento com pipeline kanban, automações e relatórios de conversão em tempo real.",
      image: heroCrm,
      link: "/produtos/flexus-crm" as const,
    },
    {
      icon: House,
      title: "FLEXUS | Casa360°",
      desc: "ERP doméstico: estoque da despensa, lista de compras automática, controle de validade e finanças da casa.",
      image: heroCasa360,
      link: "/produtos/flexus-casa360" as const,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={heroMain} alt="Equipe analisando dados em dashboards" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <Logo
          size={420}
          variant="mark"
          inverted
          className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 opacity-[0.08] lg:block"
        />
        <div className="container-wide relative z-10 flex min-h-[600px] flex-col items-center justify-center px-4 py-24 text-center">

          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Soluções SaaS de Gestão Inteligente para Seu Negócio
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80 md:text-xl">
            Tecnologia, dados e gestão em uma só direção
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato" onClick={() => trackCTAClick("Solicite Demo Grátis", "hero")}>
              <Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
                Solicite Demo Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/contato" onClick={() => trackCTAClick("Fale Conosco", "hero")}>
              <Button size="lg" variant="heroOutline">
                Fale Conosco
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section className="section-padding bg-surface">
        <div className="container-wide text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Transformamos dados em decisões</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            A XFTS Inteligência Analítica é especializada em sistemas SaaS que transformam a gestão do seu negócio com dados inteligentes e automação.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: Zap, title: "Eficiência", desc: "Automatize processos e ganhe produtividade no dia a dia do seu negócio." },
              { icon: BarChart3, title: "Inovação", desc: "Tecnologia de ponta com inteligência analítica integrada aos seus processos." },
              { icon: Shield, title: "Suporte", desc: "Equipe dedicada para garantir o melhor uso das nossas soluções." },
            ].map((v) => (
              <Card key={v.title} className="border-border bg-card">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <v.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-card-foreground">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="section-padding">
        <div className="container-wide">
          <h2 className="text-center text-3xl font-bold text-foreground md:text-4xl">Nossos Produtos</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Conheça nossas soluções SaaS especializadas para diferentes segmentos.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.title} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img src={p.image} alt={p.title} loading="lazy" width={640} height={360} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <p.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-card-foreground">{p.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
                  <Link to={p.link} className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline" onClick={() => trackProductClick(p.title)}>
                    Saiba Mais <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Form */}
      <section className="section-padding gradient-primary">
        <div className="container-wide">
          <div className="mx-auto max-w-xl text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">Comece Agora</h2>
              <ZapierSettings />
            </div>
            <p className="mt-4 text-primary-foreground/70">Preencha o formulário e nossa equipe entrará em contato.</p>
            <form className="mt-8 grid gap-4" onSubmit={handleDemoSubmit}>
              <Input placeholder="Nome" className="bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 border-primary-foreground/20"
                value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              <Input placeholder="Email" type="email" className="bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 border-primary-foreground/20"
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              <Input placeholder="Telefone" className="bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 border-primary-foreground/20"
                value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} required />
              <select className="rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground"
                value={formData.segmento} onChange={(e) => setFormData({ ...formData, segmento: e.target.value })} required>
                <option value="" className="text-foreground">Selecione o segmento</option>
                <option value="clinica" className="text-foreground">Clínica</option>
                <option value="barbearia" className="text-foreground">Barbearia</option>
                <option value="estetica" className="text-foreground">Estética / Salão</option>
                <option value="outro" className="text-foreground">Outro</option>
              </select>
              <Button type="submit" size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" disabled={sending}>
                {sending ? "Enviando..." : "Solicitar Demonstração"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
