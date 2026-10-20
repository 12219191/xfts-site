import { CheckoutModal } from "@/components/CheckoutModal";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Minus, ArrowRight, HelpCircle, ChevronDown, Shield, X } from "lucide-react";
import { SEATS_BY_TIER, SEATS_BY_APP, seatsLabel } from "@/lib/flexus-apps";
import { trackCTAClick } from "@/lib/tracking";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import {
  clinicaPlans,
  barbeariasPlans,
  esteticasPlans,
  abaPlans,
  crmPlans,
  casa360Plans,
  flowPlans,
} from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase, siteCta } from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import type { ProductPlan as CatalogProductPlan } from "@/lib/product-plans";


const PRODUCT_KEYS = ["clinica", "barbearia", "estetica", "aba", "crm", "casa360", "atende", "flow"] as const;
type ProductKey = (typeof PRODUCT_KEYS)[number];

export const Route = createFileRoute("/produtos/comparar-planos")({
  validateSearch: (search: Record<string, unknown>): { produto?: ProductKey } => {
    const produto = search.produto as ProductKey;
    return PRODUCT_KEYS.includes(produto) ? { produto } : {};
  },
  loader: async () => {
    const snapshot = await getPublicCatalog();
    const plansByProduct: Record<string, CatalogProductPlan[]> = {};
    const availability: Record<string, { buyable: boolean; badge: string | null }> = {};
    for (const key of PRODUCT_KEYS) {
      plansByProduct[key] = plansForProduct(snapshot, key);
      const entry = snapshot.products.find((p) => p.key === key);
      availability[key] = entry
        ? { buyable: canPurchase(entry), badge: siteCta(entry).badge }
        : { buyable: true, badge: null };
    }
    return { plansByProduct, availability };
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
  /** Tiers do catálogo por coluna (padrão basico/pro/enterprise). */
  tiers?: { basico: string; pro: string; enterprise: string };
  labels?: { basico: string; pro: string; enterprise: string };
  /** Usa as colunas do catálogo para usuários e permite checkout nas três colunas. */
  allTiersOnline?: boolean;
}

type Column = "basico" | "pro" | "enterprise";

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
    prices: { basico: 99, pro: 199, enterprise: 349 },
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
      { name: "Profissionais inclusos", basico: "2", pro: "Até 5", enterprise: "Ilimitado" },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
  {
    key: "estetica",
    product: "FLEXUS | Estética",
    slug: "/produtos/gestao-esteticas",
    prices: { basico: 99, pro: 199, enterprise: 379 },
    features: [
      { name: "Gestão de vendas e PDV", basico: true, pro: true, enterprise: true },
      { name: "Controle de estoque", basico: true, pro: true, enterprise: true },
      { name: "Agendamento online", basico: true, pro: true, enterprise: true },
      { name: "CRM de clientes", basico: true, pro: true, enterprise: true },
      { name: "Controle de pacotes e sessões", tooltip: "Gerencie pacotes de sessões com controle automático", basico: false, pro: true, enterprise: true },
      { name: "Ficha de anamnese e evolução", basico: true, pro: true, enterprise: true },
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
  {
    key: "casa360",
    product: "FLEXUS | Casa360°",
    slug: "/produtos/flexus-casa360",
    prices: { basico: 99, pro: 199, enterprise: 399 },
    features: [
      { name: "Estoque da casa", tooltip: "Despensa, geladeira e armário sempre atualizados", basico: true, pro: true, enterprise: true },
      { name: "Lista de compras automática", tooltip: "Itens com estoque baixo entram sozinhos na lista", basico: true, pro: true, enterprise: true },
      { name: "Controle de validade", basico: true, pro: true, enterprise: true },
      { name: "Finanças da casa", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "Painel Visão da Casa", basico: true, pro: true, enterprise: true },
      { name: "Contas recorrentes e lembretes", basico: false, pro: true, enterprise: true },
      { name: "Histórico e comparação de preços", basico: false, pro: true, enterprise: true },
      { name: "Relatórios mensais", basico: "Básico", pro: "Avançado", enterprise: "Completo" },
      { name: "App mobile", basico: true, pro: true, enterprise: true },
      { name: "Múltiplas residências", basico: false, pro: false, enterprise: true },
      { name: "Moradores inclusos", basico: "1", pro: "Até 6", enterprise: "Ilimitado" },
      { name: "Suporte", basico: "Email", pro: "Prioritário", enterprise: "Dedicado 24/7" },
    ],
  },
];

products.push({
  key: "atende",
  product: "FLEXUS | Atende",
  slug: "/produtos/flexus-atende",
  prices: { basico: 129, pro: 429, enterprise: 869 },
  tiers: { basico: "basic", pro: "standard", enterprise: "corporate" },
  labels: { basico: "Basic", pro: "Standard", enterprise: "Corporate" },
  allTiersOnline: true,
  features: [
    { name: "Agentes de IA (em desenvolvimento)", basico: "Até 2", pro: "Até 10", enterprise: "Até 20" },
    { name: "Créditos de IA por mês", tooltip: "Renovam todo mês no aniversário da assinatura, também no plano anual", basico: "2.500", pro: "11.500", enterprise: "30.000" },
    { name: "Números de WhatsApp oficial", basico: "1", pro: "1", enterprise: "Ilimitados" },
    { name: "Departamentos", basico: "Até 2", pro: "Até 5", enterprise: "Ilimitados" },
    { name: "Agenda Nativa", basico: true, pro: true, enterprise: true },
    { name: "Google Agenda e Agenda Externa", basico: false, pro: true, enterprise: true },
    { name: "Relatórios", basico: "Básicos (7 dias)", pro: "Completos (7, 30 e 90 dias)", enterprise: "Completos + exportação" },
    { name: "Campanhas (disparo ativo)", basico: false, pro: true, enterprise: true },
    { name: "API pública para integrações", basico: false, pro: false, enterprise: true },
    { name: "Conversas do WhatsApp", tooltip: "As mensagens e conversas do WhatsApp oficial são faturadas pela Meta diretamente na conta WABA da empresa", basico: "Cobradas pela Meta", pro: "Cobradas pela Meta", enterprise: "Cobradas pela Meta" },
  ],
});

products.push({
  key: "flow",
  product: "FLEXUS | Flow",
  slug: "/produtos/flexus-flow",
  prices: { basico: 89, pro: 249, enterprise: 549 },
  tiers: { basico: "start", pro: "pro", enterprise: "business" },
  labels: { basico: "Start", pro: "Pro", enterprise: "Business" },
  allTiersOnline: true,
  features: [
    { name: "Contatos ativos", tooltip: "Contato com ao menos uma interação no ciclo de cobrança", basico: "Até 500", pro: "Até 2.500", enterprise: "Até 10.000" },
    { name: "Canais WhatsApp, Instagram e Facebook (em desenvolvimento)", basico: "1", pro: "3", enterprise: "Ilimitados" },
    { name: "Fluxos ativos", basico: "5", pro: "Ilimitados", enterprise: "Ilimitados" },
    { name: "Caixa de entrada da equipe", basico: true, pro: true, enterprise: true },
    { name: "Modelos prontos", basico: true, pro: true, enterprise: true },
    { name: "Campanhas (em desenvolvimento)", basico: false, pro: true, enterprise: true },
    { name: "Agentes de IA", basico: false, pro: true, enterprise: true },
    { name: "Exportação CSV", basico: false, pro: true, enterprise: true },
    { name: "API pública (em desenvolvimento)", basico: false, pro: false, enterprise: true },
    { name: "Webhooks de saída (em desenvolvimento)", basico: false, pro: false, enterprise: true },
    { name: "Conversas do WhatsApp", tooltip: "Cobradas pela Meta diretamente na conta WABA da empresa", basico: "Cobradas pela Meta", pro: "Cobradas pela Meta", enterprise: "Cobradas pela Meta" },
  ],
});

const faqs = [
  { q: "Posso trocar de plano a qualquer momento?", a: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor será ajustado proporcionalmente (pro-rata) no próximo ciclo de faturamento." },
  { q: "Como funciona o período de teste?", a: "Todos os planos incluem 7 dias de teste grátis. Durante esse período, você tem acesso completo a todas as funcionalidades do plano escolhido, sem compromisso." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), boleto bancário e PIX. Pagamentos recorrentes são processados automaticamente." },
  { q: "Existe fidelidade ou contrato mínimo?", a: "Não! Todos os planos são sem fidelidade. Você pode cancelar a qualquer momento e continuará com acesso até o final do período já pago." },
  { q: "O que acontece com meus dados se eu cancelar?", a: "Seus dados ficam armazenados com segurança por 90 dias após o cancelamento. Você pode exportar todos os dados a qualquer momento antes disso." },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-primary" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-muted-foreground/30" />;
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

const PLANS_BY_PRODUCT: Record<ProductKey, CatalogProductPlan[]> = {
  clinica: clinicaPlans,
  barbearia: barbeariasPlans,
  estetica: esteticasPlans,
  aba: abaPlans,
  crm: crmPlans,
  casa360: casa360Plans,
  atende: [],
  flow: flowPlans,
};

function CompararPlanosPage() {
  const { produto } = Route.useSearch();
  const { plansByProduct, availability } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const isBuyable = (key: ProductKey) => availability[key]?.buyable ?? true;
  const selected =
    products.find((p) => p.key === produto) ??
    products.find((p) => isBuyable(p.key)) ??
    products[0];
  const selectedBuyable = isBuyable(selected.key);
  const [annual, setAnnual] = useState(false);
  /** Preços (lookup keys) das assinaturas ativas do visitante logado. */
  const [myPriceIds, setMyPriceIds] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const env = getStripeEnvironment() === "live" ? "live" : "sandbox";
      const { data } = await supabase
        .from("subscriptions")
        .select("price_id, status")
        .eq("user_id", session.user.id)
        .or(`environment.eq.${env},is_courtesy.is.true`)
        .in("status", ["active", "trialing", "past_due"]);
      if (!cancelled) setMyPriceIds((data ?? []).map((r) => r.price_id));
    })();
    return () => { cancelled = true; };
  }, []);
  const discount = 0.8;
  const { openCheckout, closeCheckout, isOpen, CheckoutForm } = useStripeCheckout();

  const formatPrice = (price: number) => {
    const final = annual ? Math.round(price * discount) : price;
    return `R$ ${final}`;
  };

  /** Valor mensal vindo do catálogo do banco, com fallback para a tabela local. */
  const tierOf = (productKey: ProductKey, col: Column) =>
    products.find((p) => p.key === productKey)?.tiers?.[col] ?? col;
  const catalogPlan = (productKey: ProductKey, col: Column) =>
    plansByProduct[productKey]?.find((p) => p.tier === tierOf(productKey, col));
  const isMyPlan = (productKey: ProductKey, col: Column) => {
    const plan = catalogPlan(productKey, col);
    if (!plan) return false;
    return myPriceIds.some((id) => id === plan.priceId || id === plan.annualPriceId);
  };
  const MyPlanBadge = ({ col }: { col: Column }) =>
    isMyPlan(selected.key, col) ? (
      <div className="mt-2"><Badge variant="secondary">Seu plano atual</Badge></div>
    ) : null;
  const shownPrice = (productKey: ProductKey, col: Column) => {
    const plan = catalogPlan(productKey, col);
    if (annual && productKey === "atende" && plan?.annualPrice) {
      const year = Number(plan.annualPrice.replace(/[^\d,]/g, "").replace(",", "."));
      if (year > 0) return `R$ ${(year / 12).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
    }
    return formatPrice(priceOf(productKey, col));
  };

  /** Mesma fonte que o hub: assentos do catálogo; depois limites por app e por tier. */
  const TIER_NAME: Record<Column, string> = { basico: "Básico", pro: "Pro", enterprise: "Enterprise" };
  const seatsFor = (productKey: ProductKey, col: Column): number | null => {
    const fromCatalog = catalogPlan(productKey, col)?.seats;
    if (typeof fromCatalog === "number") return fromCatalog;
    if (products.find((p) => p.key === productKey)?.allTiersOnline) return null;
    const tier = TIER_NAME[col];
    const perApp = (SEATS_BY_APP as Record<string, Record<string, number | null> | undefined>)[productKey];
    if (perApp && tier in perApp) return perApp[tier] ?? null;
    return tier in SEATS_BY_TIER ? SEATS_BY_TIER[tier] ?? null : 2;
  };

  const priceOf = (productKey: ProductKey, tier: Column) => {
    const plan = catalogPlan(productKey, tier);
    const parsed = plan ? Number(plan.price.replace(/[^\d]/g, "")) : 0;
    if (parsed > 0) return parsed;
    return products.find((p) => p.key === productKey)?.prices[tier] ?? 0;
  };

  const priceIdFor = (productKey: ProductKey, tier: Column) => {
    const plan =
      catalogPlan(productKey, tier) ??
      PLANS_BY_PRODUCT[productKey]?.find((p) => p.tier === tier);
    if (!plan) return undefined;
    return (annual && plan.annualPriceId) || plan.priceId;
  };

  const startCheckout = (productKey: ProductKey, tier: Column, section: string, label: string) => {
    trackCTAClick({ section, label, destination: "/checkout" });
    const priceId = priceIdFor(productKey, tier);
    if (!priceId) return;
    openCheckout({
      priceId,
      returnUrl: `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <TooltipProvider>
      {isOpen && CheckoutForm && (
        <CheckoutModal onClose={closeCheckout}>
          <CheckoutForm />
        </CheckoutModal>
      )}

      <section className="section-padding">
        <div className="container-wide px-4">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">Planos & Preços</span>
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
                  type="button"
                  aria-pressed={selected.key === p.key}
                  onClick={() => navigate({ search: { produto: p.key } })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    selected.key === p.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.product}
                  {availability[p.key]?.badge && (
                    <Badge variant="secondary" className="ml-2">{availability[p.key]?.badge}</Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Toggle Mensal / Anual */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card p-1.5 shadow-sm">
              <button
                type="button"
                aria-pressed={!annual}
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${!annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensal
              </button>
              <button
                type="button"
                aria-pressed={annual}
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${annual ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">-20%</span>
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
                <Button asChild variant="outline" size="sm">
                  <Link to={product.slug as any} onClick={() => trackCTAClick({ section: `planos-${product.product}`, label: "Ver produto" })}>
                    Ver produto <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {!selectedBuyable && (
                <div role="note" className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    {product.product} ainda não está disponível para contratação; os valores são uma prévia e podem mudar no lançamento.
                  </p>
                  <Button asChild size="sm" className="shrink-0 bg-cta text-cta-foreground hover:bg-cta/90">
                    <Link
                      to="/contato"
                      search={{ segmento: product.key }}
                      onClick={() => trackCTAClick({ section: `planos-${product.product}`, label: "Avise-me quando lançar", destination: "/contato" })}
                    >
                      Avise-me quando lançar
                    </Link>
                  </Button>
                </div>
              )}

              {/* Comparison Table */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-sm font-semibold text-foreground">Funcionalidade</th>
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-center">
                        <div className="text-sm font-semibold text-foreground">{product.labels?.basico ?? "Básico"}</div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{shownPrice(product.key, "basico")}<span className="text-xs font-normal text-muted-foreground">/{annual ? "mês" : "mês"}</span></div>
                        {annual && <div className="mt-0.5 text-xs text-muted-foreground line-through">R$ {priceOf(product.key, "basico")}/mês</div>}
                        <MyPlanBadge col="basico" />
                      </th>
                      <th className="sticky top-0 z-10 border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{product.labels?.pro ?? "Pro"}</span>
                          <span className="rounded-full bg-cta px-2.5 py-0.5 text-[10px] font-bold text-cta-foreground uppercase tracking-wide">Mais Popular</span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{shownPrice(product.key, "pro")}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                        {annual && <div className="mt-0.5 text-xs text-muted-foreground line-through">R$ {priceOf(product.key, "pro")}/mês</div>}
                        <MyPlanBadge col="pro" />
                      </th>
                      <th className="sticky top-0 z-10 bg-card px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{product.labels?.enterprise ?? "Enterprise"}</span>
                          <span className="rounded-full bg-gradient-to-r from-gold to-gold-deep px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground uppercase tracking-wide">Premium</span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-foreground">{shownPrice(product.key, "enterprise")}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                        {annual && <div className="mt-0.5 text-xs text-muted-foreground line-through">R$ {priceOf(product.key, "enterprise")}/mês</div>}
                        <MyPlanBadge col="enterprise" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        name: "Usuários inclusos",
                        tooltip:
                          "Quantidade de pessoas da equipe que o titular pode convidar dentro do sistema. Clientes finais que acessam o portal por link não contam.",
                        basico: seatsLabel(seatsFor(product.key, "basico")),
                        pro: seatsLabel(seatsFor(product.key, "pro")),
                        enterprise: seatsLabel(seatsFor(product.key, "enterprise")),
                      } as PlanFeature,
                      ...product.features,
                    ].map((feature, idx) => (

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
                    {!selectedBuyable ? (
                    <tr className="border-t border-border">
                      <td className="px-6 py-5" />
                      {(["basico", "pro", "enterprise"] as const).map((col) => (
                        <td key={col} className="px-6 py-5 text-center">
                          <Button type="button" variant="outline" className="w-full" disabled>
                            Em breve
                          </Button>
                        </td>
                      ))}
                    </tr>
                    ) : (
                    <tr className="border-t border-border">
                      <td className="px-6 py-5" />
                      <td className="px-6 py-5 text-center">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => startCheckout(product.key, "basico", `planos-${product.product}`, "Começar - Básico")}
                        >
                          Começar
                        </Button>
                      </td>
                      <td className="border-x-2 border-cta/20 bg-cta/[0.03] px-6 py-5 text-center">
                        <Button
                          className="w-full bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/20"
                          onClick={() => startCheckout(product.key, "pro", `planos-${product.product}`, "Começar - Pro")}
                        >
                          Começar Agora
                        </Button>
                      </td>

                      <td className="px-6 py-5 text-center">
                        {product.allTiersOnline && priceIdFor(product.key, "enterprise") ? (
                          <Button
                            className="w-full bg-gradient-to-r from-gold to-gold-deep text-gold-foreground hover:from-gold-deep hover:to-gold-deep shadow-lg shadow-gold-deep/20"
                            onClick={() => startCheckout(product.key, "enterprise", `planos-${product.product}`, `Começar - ${product.labels?.enterprise ?? "Enterprise"}`)}
                          >
                            Começar Agora
                          </Button>
                        ) : (
                        <Button asChild className="w-full bg-gradient-to-r from-gold to-gold-deep text-gold-foreground hover:from-gold-deep hover:to-gold-deep shadow-lg shadow-gold-deep/20">
                          <Link to="/contato" onClick={() => trackCTAClick({ section: `planos-${product.product}`, label: "Falar com Consultor" })}>
                            Falar com Consultor
                          </Link>
                        </Button>
                        )}
                      </td>
                    </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Guarantee */}
          <div className="mx-auto mt-16 flex max-w-md items-center gap-4 rounded-2xl border border-cta/20 bg-primary/5 p-6">
            <Shield className="h-10 w-10 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">7 dias grátis para testar</p>
              <p className="mt-1 text-sm text-muted-foreground">Cancele dentro do período de teste e nada é cobrado.</p>
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
            <Button asChild size="lg" className="mt-6 bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg shadow-cta/30">
              <Link to="/contato" onClick={() => trackCTAClick({ section: "cta-final", label: "Falar com Especialista" })}>
                Falar com Especialista <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
