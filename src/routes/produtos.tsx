import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackProductCta } from "@/lib/tracking";
import { siteCta, type CatalogProduct } from "@/lib/catalog";
import {
  Stethoscope,
  Scissors,
  Sparkles,
  Brain,
  TrendingUp,
  House,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

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

const ICONS: Record<string, LucideIcon> = {
  Stethoscope,
  Scissors,
  Sparkles,
  Brain,
  TrendingUp,
  House,
};

function ProdutosLayout() {
  return <Outlet />;
}

export function ProdutosIndex({ products }: { products: CatalogProduct[] }) {
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
          {products.map((p) => {
            const Icon = ICONS[p.icon] ?? Sparkles;
            const cta = siteCta(p);
            const href = p.ctaHref || p.landing;
            return (
              <Card key={p.key} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img src={p.imageUrl} alt={p.imageAlt} loading="lazy" decoding="async" width={640} height={360} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-card-foreground">{p.displayName}</h2>
                    {cta.badge && <Badge variant="secondary">{cta.badge}</Badge>}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{p.shortDescription}</p>
                  {p.status === "beta" && p.betaNote ? (
                    <p className="mt-2 text-xs text-muted-foreground">{p.betaNote}</p>
                  ) : null}
                  {cta.notice ? (
                    <p className="mt-2 text-xs text-muted-foreground">{cta.notice}</p>
                  ) : null}
                  {cta.action === "none" ? (
                    <Button className="mt-4" variant="outline" disabled>
                      {cta.label}
                    </Button>
                  ) : (
                    <a
                      href={href}
                      onClick={() =>
                        trackProductCta({
                          productKey: p.key,
                          productName: p.displayName,
                          productStatus: p.status,
                          ctaAction: cta.action,
                          label: cta.label,
                          section: "cards-produtos",
                          destination: href,
                          placement: "card",
                        })
                      }
                    >

                      <Button className="mt-4 bg-cta text-cta-foreground hover:bg-cta/90">
                        {cta.label} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}

        </div>
      </section>
    </>
  );
}

