import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { productJsonLd } from "@/lib/product-schema";
import { markFlowDev, markFlowPlans } from "@/lib/flow-dev-features";
import { flowPlans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";
import { trackCTAClick } from "@/lib/tracking";

const PATH = "/produtos/flexus-flow";
const TITLE = "FLEXUS | Flow - Automação de Conversas no WhatsApp, Instagram e Facebook";

export const Route = createFileRoute("/produtos/flexus-flow")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "flow") ?? null,
      plans: plansForProduct(snapshot, "flow"),
    };
  },
  head: ({ loaderData }) => {
    const plans = loaderData?.plans?.length ? loaderData.plans : fallbackPlans;
    const product = loaderData?.product ?? null;
    const sellable = product ? canPurchase(product) : false;
    const priceSentence = sellable
      ? `Planos a partir de ${lowestMonthlyPrice(plans, "R$ 89")}/mês, com 7 dias grátis.`
      : "Em breve: entre na lista de espera.";
    const description = `Fluxos visuais, gatilhos por palavra-chave, comentário, anúncio e link, campanhas e leads direto no CRM. ${priceSentence}`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: description },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `https://xfts-flexus.com${PATH}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: `https://xfts-flexus.com${PATH}` }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | Flow",
          description:
            "Automação de conversas no WhatsApp, Instagram e Facebook com fluxos visuais, caixa de entrada da equipe e captura de leads.",
          path: PATH,
          plans,
        }),
      ],
    };
  },
  component: FlexusFlowPage,
});

const fallbackFeatures = [
  "Fluxos visuais de conversa",
  "Gatilhos por palavra-chave, comentário, anúncio e link",
  "Caixa de entrada da equipe",
  "Captura de leads e envio ao CRM",
  "Campanhas (disparo ativo)",
  "Modelos prontos de conversa",
  "WhatsApp, Instagram e Facebook",
  "Agentes de IA dentro dos fluxos",
];

const segments = ["Barbearias", "Clínicas", "Estéticas e salões", "Infoprodutores", "E-commerce", "Agências"];
const templates = ["Agendar", "Preço", "Demonstração", "Suporte", "Orçamento"];

const previewPlans = [
  { name: "Start", price: "R$ 89/mês", items: ["Até 500 contatos ativos", "1 canal", "3 usuários", "5 fluxos ativos", "Caixa de entrada e modelos prontos"] },
  { name: "Pro", price: "R$ 249/mês", popular: true, items: ["Até 2.500 contatos ativos", "3 canais", "10 usuários", "Fluxos ilimitados", "Campanhas e agentes de IA"] },
  { name: "Business", price: "R$ 549/mês", items: ["Até 10.000 contatos ativos", "Canais ilimitados", "25 usuários", "Fluxos ilimitados", "API pública e webhooks de saída"] },
  { name: "Enterprise", price: "Sob consulta", items: ["Volume sob medida", "Canais e fluxos ilimitados", "Usuários sob medida", "Todos os recursos"] },
];

const faqs = [
  { q: "Qual a diferença entre o Flow e o Atende?", a: "O Atende é a caixa de entrada com agentes de IA para atender no WhatsApp. O Flow automatiza conversas por gatilhos, cria fluxos visuais, dispara campanhas e envia leads ao CRM. Os dois se complementam." },
  { q: "O que é um contato ativo?", a: "É o contato que teve ao menos uma interação com a sua empresa no ciclo de cobrança." },
  { q: "As conversas do WhatsApp estão incluídas?", a: "Não. As conversas do WhatsApp oficial são cobradas pela Meta diretamente na conta WABA da empresa." },
  { q: "Preciso de conta Business verificada?", a: "Sim. WhatsApp, Instagram e Facebook usam as APIs oficiais da Meta e exigem conta Business verificada." },
  { q: "Tem fidelidade?", a: "Não. Mensal ou anual (20% de desconto), com 7 dias grátis e cancelamento quando quiser." },
];

function FlexusFlowPage() {
  const { product, plans } = Route.useLoaderData();
  const purchasable = product ? canPurchase(product) : false;

  return (
    <ProductPageLayout
      productKey="flow"
      app="flow"
      product={product}
      plans={markFlowPlans(plans)}
      fallback={{
        name: "FLEXUS | Flow",
        headline: "FLEXUS | Flow",
        subheadline:
          "Automatize conversas no WhatsApp, Instagram e Facebook com fluxos visuais e envie os leads direto ao CRM.",
        description:
          "Automação de conversas no WhatsApp, Instagram e Facebook com fluxos visuais, caixa de entrada da equipe e captura de leads.",
        features: fallbackFeatures.map(markFlowDev),
        plansSubtitle: "Planos por contatos ativos. Mensal ou anual com 20% de desconto, 7 dias grátis, sem fidelidade.",
      }}
    >
      <section className="section-padding">
        <div className="container-wide grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold text-foreground">Flow e Atende: qual a diferença?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              O <strong>FLEXUS | Atende</strong> é a caixa de entrada com agentes de IA para atender no WhatsApp. O{" "}
              <strong>FLEXUS | Flow</strong> automatiza conversas por gatilhos (palavra-chave, comentário, anúncio, link), cria
              fluxos visuais, dispara campanhas e envia leads ao CRM. Os dois se complementam.
            </p>
            <Link to="/produtos/flexus-atende" className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline">
              Conhecer o FLEXUS | Atende <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold text-foreground">Para quem é</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {segments.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-semibold text-foreground">Modelos prontos por motivo de contato</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {templates.map((t) => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="container-wide mt-6 grid gap-4 md:grid-cols-2">
          <p role="note" className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
            <Info className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            As conversas do WhatsApp oficial são cobradas pela Meta diretamente na conta WABA da empresa. A assinatura do Flow não inclui esse custo.
          </p>
          <p role="note" className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-foreground">
            <Info className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            WhatsApp e Instagram/Facebook usam as APIs oficiais da Meta e exigem conta Business verificada. A conexão real com esses canais está em desenvolvimento. TikTok: em breve.
          </p>
        </div>
      </section>

      {!purchasable && (
        <section className="section-padding bg-surface" aria-labelledby="flow-previa">
          <div className="container-wide">
            <h2 id="flow-previa" className="text-center text-2xl font-bold text-foreground">Prévia dos planos</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Valores de lançamento, podem mudar. Contato ativo = contato com ao menos uma interação no ciclo de cobrança.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {previewPlans.map((p) => (
                <div key={p.name} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                    {p.popular && <Badge>Mais Popular</Badge>}
                  </div>
                  <p className="mt-1 text-xl font-extrabold text-foreground">{p.price}</p>
                  <ul className="mt-4 space-y-2">
                    {p.items.map(markFlowDev).map((i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section-padding">
        <div className="container-wide text-center">
          <p className="text-sm text-muted-foreground">
            Contato ativo = contato com ao menos uma interação no ciclo de cobrança. Enterprise: fale com um consultor.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link
                to="/produtos/comparar-planos"
                search={{ produto: "flow" }}
                onClick={() => trackCTAClick({ section: "pricing", label: "Comparar os planos do FLEXUS | Flow em detalhe", destination: "/produtos/comparar-planos" })}
              >
                Comparar os planos do FLEXUS | Flow em detalhe
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                to="/contato"
                search={{ segmento: "flow" }}
                onClick={() => trackCTAClick({ section: "pricing", label: "Falar com Consultor", destination: "/contato" })}
              >
                Falar com Consultor (Enterprise)
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="container-wide mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-foreground">Perguntas frequentes</h2>
          <dl className="mt-6 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-card p-5">
                <dt className="font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </ProductPageLayout>
  );
}
