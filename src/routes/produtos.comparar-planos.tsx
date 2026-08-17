import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Minus, ArrowRight, HelpCircle, ChevronDown, Shield } from "lucide-react";
import { trackCTAClick } from "@/lib/tracking";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PRODUCT_KEYS = ["clinica", "barbearia", "estetica", "aba", "crm"] as const;
type ProductKey = (typeof PRODUCT_KEYS)[number];

export const Route = createFileRoute("/produtos/comparar-planos")({
  validateSearch: (search: Record<string, unknown>): { produto?: ProductKey } => {
    const produto = search.produto as ProductKey;
    return PRODUCT_KEYS.includes(produto) ? { produto } : {};
  },
  head: () => ({
    meta: [
      { title: "Comparar Planos - XFTS Inteligência Analítica" },
      { name: "description", content: "Compare os planos Básico, Pro e Enterprise de cada sistema FLEXUS. Escolha o ideal para o seu negócio." },
      { property: "og:title", content: "Comparar Planos - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Compare os planos Básico, Pro e Enterprise de cada sistema FLEXUS." },
    ],
  }),
  component: CompararPlanosPage,
});

type FeatureValue = boolean | string;

interface PlanFeature {
  name: string;
  tooltip?: string;
  basico: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

interface ProductPlan {
  key: ProductKey;
  product: string;
  slug: string;
  prices: { basico: number; pro: number; enterprise: number };
  features: PlanFeature[];
}

const products: ProductPlan[] = [
  {
    key: "clinica",
    product: "FLEXUS | Clínica",
    slug: "/produtos/gestao-clinica",
    prices: { basico: 99, pro: 199, enterprise: 399 },
    features: [
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "Prontuário eletrônico", basico: true, pro: true, enterprise: true },
      { name: "Controle financeiro", basico: true, pro: true, enterprise: true },
      { name: "Emissão de recibos", basico: true, pro: true, enterprise: true },
      { name: "Notificações automáticas", tooltip: "Lembretes via email e WhatsApp para pacientes", basico: false, pro: true, enterprise: true },
      { name: "Relatórios analíticos", tooltip: "Dashboards de faturamento, ocupação e performance", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Gestão de equipe", basico: false, pro: true, enterprise: true },
      { name: "Integração com convênios", tooltip: "Integre com os principais convênios de saúde", basico: false, pro: false, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "API e integrações", tooltip: "REST API completa para integrar com outros sistemas", basico: false, pro: false, enterprise: true },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    key: "barbearia",
    product: "FLEXUS | Barbearia",
    slug: "/produtos/gestao-barbearias",
    prices: { basico: 89, pro: 169, enterprise: 349 },
    features: [
      { name: "PDV integrado", basico: true, pro: true, enterprise: true },
      { name: "Controle de estoque", basico: true, pro: true, enterprise: true },
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "CRM de clientes", basico: true, pro: true, enterprise: true },
      { name: "Gestão de comissões", tooltip: "Comissões automáticas por profissional e serviço", basico: false, pro: true, enterprise: true },
      { name: "Relatórios de performance", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Controle de caixa", basico: true, pro: true, enterprise: true },
      { name: "Notificações por WhatsApp", basico: false, pro: true, enterprise: true },
      { name: "Fidelização de clientes", tooltip: "Programa de pontos e recompensas automático", basico: false, pro: true, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    key: "estetica",
    product: "FLEXUS | Estética",
    slug: "/produtos/gestao-esteticas",
    prices: { basico: 99, pro: 189, enterprise: 379 },
    features: [
      { name: "Gestão de vendas e PDV", basico: true, pro: true, enterprise: true },
      { name: "Controle de estoque", basico: true, pro: true, enterprise: true },
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "CRM de clientes", basico: true, pro: true, enterprise: true },
      { name: "Controle de pacotes e sessões", tooltip: "Gerencie pacotes de sessões com controle automático", basico: false, pro: true, enterprise: true },
      { name: "Gestão de comissões", basico: false, pro: true, enterprise: true },
      { name: "Relatórios analíticos", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Notificações automáticas", basico: false, pro: true, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "API e integrações", basico: false, pro: false, enterprise: true },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    key: "aba",
    product: "FLEXUS | ABA",
    slug: "/produtos/flexus-aba",
    prices: { basico: 99, pro: 199, enterprise: 399 },
    features: [
      { name: "Registro de tentativas (DTT)", basico: true, pro: true, enterprise: true },
      { name: "Agenda de sessões", basico: true, pro: true, enterprise: true },
      { name: "Prontuário multidisciplinar", basico: true, pro: true, enterprise: true },
      { name: "Relatórios para responsáveis", basico: true, pro: true, enterprise: true },
      { name: "Gráficos de evolução", tooltip: "Visualize a evolução por objetivo terapêutico ao longo do tempo", basico: false, pro: true, enterprise: true },
      { name: "Plano terapêutico individualizado", basico: false, pro: true, enterprise: true },
      { name: "Controle de horas autorizadas", tooltip: "Acompanhe horas autorizadas por convênio e responsável", basico: false, pro: true, enterprise: true },
      { name: "Integração com convênios", basico: false, pro: false, enterprise: true },
      { name: "Multi-unidades", basico: false, pro: false, enterprise: true },
      { name: "Profissionais inclusos", basico: "1", pro: "Até 10", enterprise: "Ilimitado" },
      { name: "API e integrações", basico: false, pro: false, enterprise: true },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    key: "crm",
    product: "FLEXUS | CRM",
    slug: "/produtos/flexus-crm",
    prices: { basico: 99, pro: 199, enterprise: 399 },
    features: [
      { name: "Pipeline kanban", basico: true, pro: true, enterprise: true },
      { name: "Gestão de leads e oportunidades", basico: true, pro: true, enterprise: true },
      { name: "Importação de contatos", basico: true, pro: true, enterprise: true },
      { name: "Relatórios de conversão", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Automações de follow-up", tooltip: "Sequências automáticas de e-mail e tarefas", basico: false, pro: true, enterprise: true },
      { name: "WhatsApp integrado", basico: false, pro: true, enterprise: true },
      { name: "Funil customizável", basico: false, pro: true, enterprise: true },
      { name: "App mobile", basico: true, pro: true, enterprise: true },
      { name: "Múltiplas equipes", basico: false, pro: false, enterprise: true },
      { name: "Usuários inclusos", basico: "Até 3", pro: "Até 15", enterprise: "Ilimitado" },
      { name: "API e integrações", basico: false, pro: false, enterprise: true },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
];

const faqs = [
  { q: "Posso trocar de plano a qualquer momento?", a: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor será ajustado proporcionalmente (pro-rata) no próximo ciclo de faturamento." },
  { q: "Como funciona o período de teste?", a: "Todos os planos incluem 7 dias de teste grátis. Durante esse período, você tem acesso completo a todas as funcionalidades do plano escolhido, sem compromisso." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), boleto bancário e PIX. Pagamentos recorrentes são processados automaticamente." },
  { q: "Existe fidelidade ou contrato mínimo?", a: "Não! Todos os planos são sem fidelidade. Você pode cancelar a qualquer momento e continuará com acesso até o final do período já pago." },
  { q: "O que acontece com meus dados se eu cancelar?", a: "Seus dados ficam armazenados com segurança por 90 dias após o cancelamento. Você pode exportar todos os dados a qualquer momento antes disso." },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-cta" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-muted-foreground/30" />;
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

function CompararPlanosPage() {
  const { produto } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const selected = products.find((p) => p.key === produto) ?? products[0];
  const [annual, setAnnual] = useState(false);
  const discount = 0.8;

  const formatPrice = (price: number) => {
    const final = annual ? Math.round(price * discount) : price;
    return `R$ ${final}`;
  };

  return (
    <TooltipProvider>
      <section className="section-padding">
        <div className="container-wide px-4">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-cta/10 px-4 py-1.5 text-sm font-medium text-cta">Planos & Preços</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Escolha o plano ideal
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Compare os planos de cada sistema FLEXUS. Todos incluem 7 dias grátis, sem compromisso.
            </p>

            {/* Seletor de sistema */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {products.map((p) => (
                <button
                  key={p.key}
                  onClick={() => navigate({ search: { produto: p.key } })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    selected.key === p.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.product}
                </button>
              ))}
            </div>

            {/* Toggle Mensal / Anual */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1.5 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${!annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual
                <span className="ml-2 rounded-full bg-cta/15 px-2 py-0.5 text-[11px] font-semibold text-cta">-20%</span>
              </button>
            </div>
          </div>

          {/* Produto selecionado */}
          {[selected].map((product) => (
            <div key={product.key} className="mt-16">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{product.product}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Compare funcionalidades lado a lado</p>
                </div>
                <Link to={product.slug as any}>
                  <Button variant="outline" size="sm" onClick={() => trackCTAClick("Ver produto", `comparar-${product.product}`)}>
                    Ver produto <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-sm font-semibold text-foreground">Funcionalidade</th>
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-center">
                        <div className="text-sm font-semibold text-foreground">Básico</div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{formatPrice(product.prices.basico)}<span className="text-xs font-normal text-muted-foreground">/{annual ? "mês" : "mês"}</span></div>
                        {annual && <div className="mt-0.5 text-xs text-muted-foreground line-through">R$ {product.prices.basico}/mês</div>}
                      </th>
                      <th className="sticky top-0 z-10 border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Pro</span>
                          <span className="rounded-full bg-cta px-2.5 py-0.5 text-[10px] font-bold text-cta-foreground uppercase tracking-wide">Mais Popular</span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{formatPrice(product.prices.pro)}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                        {annual && <div className="mt-0.5 text-xs text-muted-foreground line-through">R$ {product.prices.pro}/mês</div>}
                      </th>
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Enterprise</span>
                          <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">Premium</span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{formatPrice(product.prices.enterprise)}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                        {annual && <div className="mt-0.5 text-xs text-muted-foreground line-through">R$ {product.prices.enterprise}/mês</div>}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.features.map((feature, idx) => (
                      <tr key={feature.name} className={`border-b border-border/50 last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-6 py-3.5 text-sm text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            {feature.name}
                            {feature.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px]">
                                  <p>{feature.tooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center"><FeatureCell value={feature.basico} /></td>
                        <td className="border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-3.5 text-center"><FeatureCell value={feature.pro} /></td>
                        <td className="px-6 py-3.5 text-center"><FeatureCell value={feature.enterprise} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td className="px-6 py-5" />
                      <td className="px-6 py-5 text-center">
                        <Link to="/contato">
                          <Button variant="outline" className="w-full" onClick={() => trackCTAClick("Começar - Básico", `comparar-${product.product}`)}>
                            Começar
                          </Button>
                        </Link>
                      </td>
                      <td className="border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-5 text-center">
                        <Link to="/contato">
                          <Button className="w-full bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/20" onClick={() => trackCTAClick("Começar - Pro", `comparar-${product.product}`)}>
                            Começar Agora
                          </Button>
                        </Link>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Link to="/contato">
                          <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20" onClick={() => trackCTAClick("Falar com Consultor", `comparar-${product.product}`)}>
                            Falar com Consultor
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Guarantee */}
          <div className="mx-auto mt-16 flex max-w-md items-center gap-4 rounded-2xl border border-cta/20 bg-cta/5 p-6">
            <Shield className="h-10 w-10 shrink-0 text-cta" />
            <div>
              <p className="font-semibold text-foreground">Garantia de 7 dias</p>
              <p className="mt-1 text-sm text-muted-foreground">Teste gratuitamente por 7 dias. Se não gostar, cancele sem custo algum.</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-2xl">
            <h3 className="text-center text-2xl font-bold text-foreground">Perguntas Frequentes</h3>
            <div className="mt-8 space-y-3">
              {faqs.map((faq) => (
                <Collapsible key={faq.q}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    {faq.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 text-center shadow-xl">
            <h3 className="text-2xl font-bold text-primary-foreground">Não tem certeza qual plano escolher?</h3>
            <p className="mt-3 text-primary-foreground/80">Nossa equipe pode ajudar a encontrar a solução perfeita para o seu negócio.</p>
            <Link to="/contato">
              <Button size="lg" className="mt-6 bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/30" onClick={() => trackCTAClick("Falar com Especialista", "comparar-planos-cta")}>
                Falar com Especialista <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
