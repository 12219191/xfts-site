import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";
import { trackCTAClick } from "@/lib/tracking";

export const Route = createFileRoute("/produtos/comparar-planos")({
  head: () => ({
    meta: [
      { title: "Comparar Planos - XFTS Inteligência Analítica" },
      { name: "description", content: "Compare os planos Básico, Pro e Enterprise de todos os produtos XFTS. Escolha o ideal para o seu negócio." },
      { property: "og:title", content: "Comparar Planos - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Compare os planos Básico, Pro e Enterprise de todos os produtos XFTS." },
    ],
  }),
  component: CompararPlanosPage,
});

type FeatureValue = boolean | string;

interface PlanFeature {
  name: string;
  basico: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

interface ProductPlan {
  product: string;
  slug: string;
  prices: { basico: string; pro: string; enterprise: string };
  features: PlanFeature[];
}

const products: ProductPlan[] = [
  {
    product: "Gestão Clínica",
    slug: "/produtos/gestao-clinica",
    prices: { basico: "R$ 99", pro: "R$ 199", enterprise: "R$ 399" },
    features: [
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "Prontuário eletrônico", basico: true, pro: true, enterprise: true },
      { name: "Controle financeiro", basico: true, pro: true, enterprise: true },
      { name: "Emissão de recibos", basico: true, pro: true, enterprise: true },
      { name: "Notificações automáticas", basico: false, pro: true, enterprise: true },
      { name: "Relatórios analíticos", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Gestão de equipe", basico: false, pro: true, enterprise: true },
      { name: "Integração com convênios", basico: false, pro: false, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "API e integrações", basico: false, pro: false, enterprise: true },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    product: "Gestão de Barbearias",
    slug: "/produtos/gestao-barbearias",
    prices: { basico: "R$ 89", pro: "R$ 169", enterprise: "R$ 349" },
    features: [
      { name: "PDV integrado", basico: true, pro: true, enterprise: true },
      { name: "Controle de estoque", basico: true, pro: true, enterprise: true },
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "CRM de clientes", basico: true, pro: true, enterprise: true },
      { name: "Gestão de comissões", basico: false, pro: true, enterprise: true },
      { name: "Relatórios de performance", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Controle de caixa", basico: true, pro: true, enterprise: true },
      { name: "Notificações por WhatsApp", basico: false, pro: true, enterprise: true },
      { name: "Fidelização de clientes", basico: false, pro: true, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    product: "Gestão de Estéticas",
    slug: "/produtos/gestao-esteticas",
    prices: { basico: "R$ 99", pro: "R$ 189", enterprise: "R$ 379" },
    features: [
      { name: "Gestão de vendas e PDV", basico: true, pro: true, enterprise: true },
      { name: "Controle de estoque", basico: true, pro: true, enterprise: true },
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "CRM de clientes", basico: true, pro: true, enterprise: true },
      { name: "Controle de pacotes e sessões", basico: false, pro: true, enterprise: true },
      { name: "Gestão de comissões", basico: false, pro: true, enterprise: true },
      { name: "Relatórios analíticos", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Notificações automáticas", basico: false, pro: true, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "API e integrações", basico: false, pro: false, enterprise: true },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-cta" />;
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-muted-foreground/40" />;
  }
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

function CompararPlanosPage() {
  return (
    <>
      <section className="section-padding">
        <div className="container-wide px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">Compare os Planos</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Escolha o plano ideal para o seu negócio. Todos incluem atualizações gratuitas e suporte técnico.
            </p>
          </div>

          {products.map((product) => (
            <div key={product.product} className="mt-16">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{product.product}</h2>
                <Link to={product.slug as any}>
                  <Button variant="outline" size="sm" onClick={() => trackCTAClick("Ver produto", `comparar-${product.product}`)}>
                    Ver produto <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-4 text-sm font-semibold text-foreground">Funcionalidade</th>
                      <th className="px-6 py-4 text-center">
                        <div className="text-sm font-semibold text-foreground">Básico</div>
                        <div className="mt-1 text-lg font-bold text-primary">{product.prices.basico}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      </th>
                      <th className="border-x border-cta/20 bg-cta/5 px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Pro</span>
                          <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-medium text-cta">Popular</span>
                        </div>
                        <div className="mt-1 text-lg font-bold text-primary">{product.prices.pro}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Enterprise</span>
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">Premium</span>
                        </div>
                        <div className="mt-1 text-lg font-bold text-primary">{product.prices.enterprise}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.features.map((feature, idx) => (
                      <tr key={feature.name} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                        <td className="px-6 py-3 text-sm text-foreground">{feature.name}</td>
                        <td className="px-6 py-3 text-center"><FeatureCell value={feature.basico} /></td>
                        <td className="border-x border-cta/20 bg-cta/5 px-6 py-3 text-center"><FeatureCell value={feature.pro} /></td>
                        <td className="px-6 py-3 text-center"><FeatureCell value={feature.enterprise} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30">
                      <td className="px-6 py-4" />
                      <td className="px-6 py-4 text-center">
                        <Link to="/contato">
                          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => trackCTAClick("Começar - Básico", `comparar-${product.product}`)}>
                            Começar
                          </Button>
                        </Link>
                      </td>
                      <td className="border-x border-cta/20 bg-cta/5 px-6 py-4 text-center">
                        <Link to="/contato">
                          <Button size="sm" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Começar - Pro", `comparar-${product.product}`)}>
                            Começar
                          </Button>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link to="/contato">
                          <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={() => trackCTAClick("Falar com Consultor", `comparar-${product.product}`)}>
                            Consultor
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          <div className="mt-16 rounded-xl border border-border bg-muted/30 p-8 text-center">
            <h3 className="text-xl font-bold text-foreground">Não tem certeza qual plano escolher?</h3>
            <p className="mt-2 text-muted-foreground">Nossa equipe pode ajudar a encontrar a solução perfeita para o seu negócio.</p>
            <Link to="/contato">
              <Button className="mt-6 bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => trackCTAClick("Falar com Especialista", "comparar-planos-cta")}>
                Falar com Especialista <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
