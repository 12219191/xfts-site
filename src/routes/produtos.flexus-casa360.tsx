import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Star, X } from "lucide-react";
import heroCasa360Asset from "@/assets/hero-casa360.webp.asset.json";
const heroCasa360 = heroCasa360AssetAsset.url;
const PRODUCT_SLUG = "casa360" as const;
import { trackCTAClick } from "@/lib/tracking";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { PricingCards } from "@/components/PricingCards";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";
import { productJsonLd } from "@/lib/product-schema";
import { casa360Plans as plans } from "@/lib/product-plans";

export const Route = createFileRoute("/produtos/flexus-casa360")({
  head: () => ({
    meta: [
      { title: "FLEXUS | Casa360° - ERP Doméstico para sua Casa" },
      { name: "description", content: "ERP doméstico com estoque da despensa, lista de compras automática, controle de validade e finanças da casa. Planos a partir de R$ 99/mês." },
      { property: "og:title", content: "FLEXUS | Casa360° - ERP Doméstico para sua Casa" },
      { property: "og:description", content: "Estoque, compras e finanças da sua casa em um só lugar. Chega de comprar duplicado ou perder validade." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://xfts-flexus.com/produtos/flexus-casa360" },
      { property: "og:image", content: heroCasa360 },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FLEXUS | Casa360° - ERP Doméstico para sua Casa" },
      { name: "twitter:description", content: "Estoque, compras e finanças da sua casa em um só lugar." },
      { name: "twitter:image", content: heroCasa360 },
    ],
    links: [
      { rel: "canonical", href: "https://xfts-flexus.com/produtos/flexus-casa360" },
    ],
    scripts: [
      productJsonLd({
        name: "FLEXUS | Casa360°",
        description: "ERP doméstico para estoque, compras e finanças da casa.",
        path: "/produtos/flexus-casa360",
        image: heroCasa360,
        plans,
      }),
    ],
  }),
  component: FlexusCasa360Page,
});

const features = [
  "Estoque da despensa, geladeira e armário",
  "Controle de validade com alertas",
  "Lista de compras automática",
  "Histórico e comparação de preços",
  "Receitas, despesas e categorias do mês",
  "Contas recorrentes e lembretes",
  "Painel Visão da Casa",
  "Vários moradores na mesma casa",
];

const pains = [
  { title: "Chega de comprar duplicado", desc: "Consulte o estoque da casa direto do mercado e compre só o que falta." },
  { title: "Nada mais vence esquecido", desc: "Alertas de validade avisam antes que o item vire desperdício." },
  { title: "Saiba para onde vai o dinheiro", desc: "Todas as despesas categorizadas, com o fechamento do mês sempre à mão." },
];

const testimonials = [
  { name: "Camila Rocha", role: "Mãe de dois - São Paulo", text: "Cortamos quase 20% do mercado no primeiro mês só por parar de comprar o que já tinha em casa." },
  { name: "Rafael Dias", role: "Mora sozinho - Campinas", text: "A lista de compras se monta sozinha. Eu só abro no mercado e vou marcando." },
  { name: "Família Menezes", role: "Casa com 4 pessoas", text: "Todo mundo lança as despesas no mesmo lugar. Acabaram as discussões sobre as contas do mês." },
];


function FlexusCasa360Page() {
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const handleCheckout = (priceId: string, label: string) => {
    trackCTAClick(label, "flexus-casa360-pricing");
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
        <img src={heroCasa360} alt="Despensa organizada com painel digital de estoque e finanças da casa" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="container-wide relative z-10 flex min-h-[500px] flex-col items-start justify-center px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-extrabold text-primary-foreground md:text-5xl">FLEXUS | Casa360°</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/80">
            Estoque, compras e finanças da sua casa em um só lugar. Sozinho, com quem mora com você ou com a família toda.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/contato"><Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Começar Grátis", "flexus-casa360-hero")}>Começar Grátis <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <AcessarSistemaButton app="casa360" size="lg" variant="heroOutline" />
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">O Casa360° organiza tudo</h2>
            <p className="mt-3 text-muted-foreground">Chega de comprar duplicado, perder validade ou não saber para onde vai o dinheiro do mês.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pains.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold text-card-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Funcionalidades</h2>
            <p className="mt-3 text-muted-foreground">Um painel com tudo o que importa na sua casa, hoje.</p>
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

      <section className="section-padding">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Planos e Preços</h2>
            <p className="mt-3 text-muted-foreground">Escolha o plano ideal para a sua casa.</p>
          </div>
          <div className="mt-12">
            <PricingCards plans={plans} trackingSection="flexus-casa360-pricing" onCheckout={handleCheckout} compareProduct="casa360" productName="FLEXUS | Casa360°" />
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
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
