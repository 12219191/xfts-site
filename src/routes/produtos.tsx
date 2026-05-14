import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Scissors, Sparkles, Brain, TrendingUp, ArrowRight } from "lucide-react";
import heroClinic from "@/assets/hero-clinic.jpg";
import heroBarbershop from "@/assets/hero-barbershop.jpg";
import heroAesthetics from "@/assets/hero-aesthetics.jpg";
import heroAba from "@/assets/hero-aba.jpg";
import heroCrm from "@/assets/hero-crm.jpg";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos - XFTS Inteligência Analítica" },
      { name: "description", content: "Conheça as soluções FLEXUS para gestão de clínicas, barbearias e estéticas." },
    ],
  }),
  component: ProdutosLayout,
});

const products = [
  {
    icon: Stethoscope,
    title: "FLEXUS | Clínicas",
    desc: "Sistema completo para consultórios e clínicas. Agendamentos, prontuários eletrônicos e controle financeiro.",
    image: heroClinic,
    link: "/produtos/gestao-clinica" as const,
  },
  {
    icon: Scissors,
    title: "FLEXUS | Barbearias",
    desc: "Controle de estoque, vendas, PDV e CRM para barbearias e salões masculinos.",
    image: heroBarbershop,
    link: "/produtos/gestao-barbearias" as const,
  },
  {
    icon: Sparkles,
    title: "FLEXUS | Estéticas",
    desc: "Estoque, vendas e CRM para clínicas de estética e salões de beleza.",
    image: heroAesthetics,
    link: "/produtos/gestao-esteticas" as const,
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
        <div className="container-wide grid gap-8 md:grid-cols-3">
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
