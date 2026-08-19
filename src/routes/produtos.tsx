import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Scissors, Sparkles, Brain, TrendingUp, House, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos FLEXUS - Sistemas de Gestão | XFTS" },
      { name: "description", content: "Conheça as soluções FLEXUS para gestão de clínicas, barbearias, estéticas, terapias ABA, CRM de vendas e Casa360°." },
      { property: "og:title", content: "Produtos FLEXUS - Sistemas de Gestão | XFTS" },
      { property: "og:description", content: "Soluções FLEXUS para clínicas, barbearias, estéticas, ABA, CRM e Casa360°." },
      { property: "og:url", content: "https://xfts-flexus.com/produtos" },
      { name: "twitter:title", content: "Produtos FLEXUS - Sistemas de Gestão | XFTS" },
      { name: "twitter:description", content: "Soluções FLEXUS para clínicas, barbearias, estéticas, ABA, CRM e Casa360°." },
    ],
  }),
  component: ProdutosLayout,
});

const products = [
  {
    icon: Stethoscope,
    title: "FLEXUS | Clínica",
    desc: "Sistema completo para consultórios e clínicas. Agendamentos, prontuários eletrônicos e controle financeiro.",
    slug: "clinica" as const,
    link: "/produtos/gestao-clinica" as const,
  },
  {
    icon: Scissors,
    title: "FLEXUS | Barbearia",
    desc: "Controle de estoque, vendas, PDV e CRM para barbearias e salões masculinos.",
    slug: "barbearia" as const,
    link: "/produtos/gestao-barbearias" as const,
  },
  {
    icon: Sparkles,
    title: "FLEXUS | Estética",
    desc: "Estoque, vendas e CRM para clínicas de estética e salões de beleza.",
    slug: "estetica" as const,
    link: "/produtos/gestao-esteticas" as const,
  },
  {
    icon: Brain,
    title: "FLEXUS | ABA",
    desc: "Sistema para clínicas de Análise do Comportamento Aplicada (ABA / TEA): coleta de dados, evolução e relatórios.",
    slug: "aba" as const,
    link: "/produtos/flexus-aba" as const,
  },
  {
    icon: TrendingUp,
    title: "FLEXUS | CRM",
    desc: "CRM de vendas multi-segmento com pipeline kanban, automações e relatórios de conversão.",
    slug: "crm" as const,
    link: "/produtos/flexus-crm" as const,
  },
  {
    icon: House,
    title: "FLEXUS | Casa360°",
    desc: "ERP doméstico: estoque da despensa, lista de compras automática e finanças da casa em um só painel.",
    slug: "casa360" as const,
    link: "/produtos/flexus-casa360" as const,
  },
];

function ProdutosLayout() {
  return <Outlet />;
}

export function ProdutosIndex() {
  return (
    <>
      <section className="gradient-primary section-padding text-center">
        <div className="container-wide">
          <h1 className="text-4xl font-extrabold text-primary-foreground md:text-5xl">Nossos Produtos</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/70">
            Soluções SaaS especializadas para transformar a gestão do seu negócio.
          </p>
        </div>
      </section>
      <section className="section-padding">
        <div className="container-wide grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.title} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
              <div className="aspect-video overflow-hidden">
                <img src={productImages[p.slug]} alt={p.title} loading="lazy" width={640} height={360} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <p.icon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-card-foreground">{p.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
                <Link to={p.link}>
                  <Button className="mt-4 bg-cta text-cta-foreground hover:bg-cta/90">
                    Saiba Mais <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
