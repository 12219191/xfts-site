import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEAD_SEGMENTS } from "@/lib/lead-segments";
import { ArrowRight, BarChart3, Shield, Zap, Stethoscope, Scissors, Sparkles, Brain, TrendingUp, House, MessageCircle } from "lucide-react";
import { useState } from "react";
import { sendToZapier, formatSentAt, type ZapierResult } from "@/lib/zapier";
import { toast } from "sonner";
import { trackCTAClick, trackProductClick, trackFormSubmit } from "@/lib/tracking";
import heroMain from "@/assets/hero-main-1920.webp";
import heroMain1024 from "@/assets/hero-main-1024.webp";
import heroMain640 from "@/assets/hero-main-640.webp";
import { Logo } from "@/components/Logo";
import { useProductImageData } from "@/lib/product-images";
import { softwareAppsJsonLd } from "@/lib/structured-data";
import { Badge } from "@/components/ui/badge";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { canPurchase, siteCta, type CatalogProduct } from "@/lib/catalog";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XFTS Inteligência Analítica - Soluções SaaS de Gestão Inteligente" },
      { name: "description", content: "FLEXUS | Clínica, Barbearia, Estética, ABA e CRM com Inteligência Analítica. Solicite uma demo grátis." },
      { property: "og:title", content: "XFTS Inteligência Analítica - Soluções SaaS de Gestão Inteligente" },
      { property: "og:description", content: "FLEXUS | Clínica, Barbearia, Estética, ABA e CRM com Inteligência Analítica. Solicite uma demo grátis." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://xfts-flexus.com/" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9f480906-6ed1-4b34-80bf-977ce01e735d/id-preview-911ffcd3--26205ede-bbe4-4e90-90d5-5be5b0db494b.lovable.app-1779899998656.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "XFTS Inteligência Analítica - Soluções SaaS de Gestão Inteligente" },
      { name: "twitter:description", content: "FLEXUS | Clínica, Barbearia, Estética, ABA e CRM com Inteligência Analítica. Solicite uma demo grátis." },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9f480906-6ed1-4b34-80bf-977ce01e735d/id-preview-911ffcd3--26205ede-bbe4-4e90-90d5-5be5b0db494b.lovable.app-1779899998656.png" },
    ],
    links: [{ rel: "canonical", href: "https://xfts-flexus.com/" }],
    scripts: [softwareAppsJsonLd()],
  }),
  loader: async (): Promise<{ catalog: CatalogProduct[] }> => {
    try {
      const snapshot = await getPublicCatalog();
      return { catalog: snapshot.products };
    } catch {
      return { catalog: [] };
    }
  },
  errorComponent: () => null,
  notFoundComponent: () => null,
  component: HomePage,
});

function HomePage() {
  const productImages = useProductImageData();
  const { catalog } = Route.useLoaderData();
  const [formData, setFormData] = useState({ nome: "", email: "", telefone: "", segmento: "" });
  const [sending, setSending] = useState(false);
  const [lastStatus, setLastStatus] = useState<ZapierResult | null>(null);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const email = formData.email;
    const result = await sendToZapier(formData, "demo", "home_demo");
    if (result.success) {
      trackFormSubmit("demo", formData.segmento);
      setFormData({ nome: "", email: "", telefone: "", segmento: "" });
      toast.success("Solicitação de demonstração recebida", {
        description: `Registrada em ${formatSentAt(result.sentAt)}. Nosso time entra em contato em até 1 dia útil pelo e-mail ${email}. Protocolo: ${result.referenceId}.`,
        duration: 10000,
      });
    } else {
      toast.error("Não foi possível enviar", { description: result.message, duration: 12000 });
    }
    setLastStatus(result);
    setSending(false);
  };

  const products = [
    {
      icon: Stethoscope,
      title: "FLEXUS | Clínica",
      desc: "Sistema completo para gestão de consultórios e clínicas, otimizando agendamentos, prontuários e finanças.",
      slug: "clinica" as const,
      link: "/produtos/gestao-clinica" as const,
    },
    {
      icon: Scissors,
      title: "FLEXUS | Barbearia",
      desc: "Estoque inteligente, PDV integrado, agendamento online, comissões e CRM para barbearias e salões masculinos.",
      slug: "barbearia" as const,
      link: "/produtos/gestao-barbearias" as const,
    },
    {
      icon: Sparkles,
      title: "FLEXUS | Estética",
      desc: "Pacotes e sessões, ficha de anamnese, agendamento online, comissões e estoque de insumos para clínicas de estética e salões.",
      slug: "estetica" as const,
      link: "/produtos/gestao-esteticas" as const,
    },
    {
      icon: Brain,
      title: "FLEXUS | ABA",
      desc: "Sistema completo para clínicas de Análise do Comportamento Aplicada (ABA / TEA): coleta de dados, evolução e relatórios.",
      slug: "aba" as const,
      link: "/produtos/flexus-aba" as const,
    },
    {
      icon: TrendingUp,
      title: "FLEXUS | CRM",
      desc: "CRM de vendas multi-segmento com pipeline kanban, automações e relatórios de conversão em tempo real.",
      slug: "crm" as const,
      link: "/produtos/flexus-crm" as const,
    },
    {
      icon: House,
      title: "FLEXUS | Casa360°",
      desc: "ERP doméstico: estoque da despensa, lista de compras automática, controle de validade e finanças da casa.",
      slug: "casa360" as const,
      link: "/produtos/flexus-casa360" as const,
    },
    {
      icon: MessageCircle,
      title: "FLEXUS | Atende",
      desc: "Atendimento pelo WhatsApp (API oficial) com agentes de IA, base de conhecimento própria e caixa de entrada para a equipe.",
      slug: "atende" as const,
      link: "/produtos/flexus-atende" as const,
    },
  ];

  const visibleProducts = products
    .map((p, index) => {
      const entry = catalog.find((c) => c.key === p.slug);
      return {
        ...p,
        index,
        entry,
        buyable: entry ? canPurchase(entry) : true,
        badge: entry ? siteCta(entry).badge : null,
      };
    })
    .filter((p) => !p.entry || p.entry.showOnWebsite)
    .sort((a, b) => Number(b.buyable) - Number(a.buyable) || a.index - b.index);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={heroMain} srcSet={`${heroMain640} 640w, ${heroMain1024} 1024w, ${heroMain} 1920w`} sizes="100vw" fetchPriority="high" alt="Equipe analisando dados em dashboards" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
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
            <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
              <Link to="/contato" onClick={() => trackCTAClick({ section: "hero", label: "Solicite Demo Grátis" })}>
                Solicite Demo Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="heroOutline">
              <Link to="/contato" onClick={() => trackCTAClick({ section: "hero", label: "Fale Conosco" })}>
                Fale Conosco
              </Link>
            </Button>
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
              { icon: Zap, title: "Menos tempo com tarefas manuais", desc: "Agenda online, lembretes, comissões e estoque automáticos para sua equipe focar no cliente." },
              { icon: BarChart3, title: "Decisões com seus próprios dados", desc: "Painéis com faturamento, ocupação e retorno de clientes atualizados em tempo real." },
              { icon: Shield, title: "Suporte humano em português", desc: "Ajuda na implantação e atendimento por WhatsApp e e-mail com resposta em até 1 dia útil." },
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
            {visibleProducts.map((p) => (
              <Card key={p.title} className="group flex flex-col overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img src={productImages[p.slug].url} alt={productImages[p.slug].alt} loading="lazy" decoding="async" width={640} height={360} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <p.icon className="h-5 w-5 shrink-0 text-primary" />
                    <h3 className="text-lg font-semibold text-card-foreground">{p.title}</h3>
                    {p.badge && <Badge variant="secondary">{p.badge}</Badge>}
                  </div>
                  <p className="mt-3 flex-1 text-left text-sm text-muted-foreground">{p.desc}</p>
                  <Link to={p.link} className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline" onClick={() => {
                    trackProductClick(p.title);
                    trackCTAClick({ section: "cards-produtos", action: `card-${p.slug}`, label: `Saiba Mais — ${p.title}`, destination: p.link });
                  }}>
                    {p.buyable ? "Saiba Mais" : "Conhecer e entrar na lista"} <ArrowRight className="ml-1 h-4 w-4" />
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
            </div>
            <p className="mt-4 text-primary-foreground/80">Preencha o formulário e nossa equipe entrará em contato.</p>
            <form className="mt-8 grid gap-4" onSubmit={handleDemoSubmit}>
              <div className="grid gap-1.5 text-left">
                <Label htmlFor="home-nome" className="text-primary-foreground">Nome</Label>
                <Input id="home-nome" name="nome" autoComplete="name" className="bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/40 focus-visible:ring-2 focus-visible:ring-cta"
                  value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div className="grid gap-1.5 text-left">
                <Label htmlFor="home-email" className="text-primary-foreground">E-mail</Label>
                <Input id="home-email" name="email" type="email" inputMode="email" autoComplete="email" className="bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/40 focus-visible:ring-2 focus-visible:ring-cta"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="grid gap-1.5 text-left">
                <Label htmlFor="home-telefone" className="text-primary-foreground">WhatsApp / Telefone</Label>
                <Input id="home-telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(17) 99999-9999" className="bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/40 focus-visible:ring-2 focus-visible:ring-cta"
                  value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} required />
              </div>
              <div className="grid gap-1.5 text-left">
                <Label htmlFor="home-segmento" className="text-primary-foreground">Qual sistema interessa?</Label>
                <select id="home-segmento" name="segmento" className="h-10 rounded-md border px-3 text-sm focus-visible:outline-none bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/40 focus-visible:ring-2 focus-visible:ring-cta"
                  value={formData.segmento} onChange={(e) => setFormData({ ...formData, segmento: e.target.value })} required>
                  <option value="" className="text-foreground">Selecione</option>
                  {LEAD_SEGMENTS.map((s) => (
                    <option key={s.value} value={s.value} className="text-foreground">{s.label}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" disabled={sending}>
                {sending ? "Enviando..." : "Solicitar Demonstração"}
              </Button>
              <p className="text-xs text-primary-foreground/80">
                Respondemos em até 1 dia útil. Ao enviar, você concorda com a{" "}
                <Link to="/politica-de-privacidade" className="underline hover:text-primary-foreground">Política de Privacidade</Link>.
              </p>
              {lastStatus && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-md border border-primary-foreground/20 bg-primary-foreground/10 p-3 text-left text-sm text-primary-foreground"
                >
                  <p className="font-medium">
                    {lastStatus.success ? "Solicitação recebida" : "Envio não concluído"}
                  </p>
                  <p className="mt-1 text-primary-foreground/80">{lastStatus.message}</p>
                  <p className="mt-2 text-xs text-primary-foreground/60">
                    Status: {lastStatus.status}
                    {lastStatus.referenceId ? ` · Protocolo ${lastStatus.referenceId}` : ""} · {formatSentAt(lastStatus.sentAt)} · {lastStatus.durationMs}ms
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
