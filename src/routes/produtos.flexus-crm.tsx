import { createFileRoute } from "@tanstack/react-router";
import { PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
import { productJsonLd } from "@/lib/product-schema";
import { crmPlans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const heroCrm = PRODUCT_IMAGE_DEFAULTS.crm;

export const Route = createFileRoute("/produtos/flexus-crm")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "crm") ?? null,
      plans: plansForProduct(snapshot, "crm"),
    };
  },
  head: ({ loaderData }) => {
    const plans = loaderData?.plans?.length ? loaderData.plans : fallbackPlans;
    const product = loaderData?.product ?? null;
    const sellable = product ? canPurchase(product) : true;
    const from = lowestMonthlyPrice(plans, "R$ 99");
    const priceSentence = sellable
      ? `Planos a partir de ${from}/mês, no cartão, mensal ou anual.`
      : "Fale com o nosso time para receber valores e condições.";
    const description = `CRM SaaS de vendas: pipeline kanban, automações de follow-up, metas e relatórios de conversão. ${priceSentence}`;
    return {
      meta: [
        { title: "FLEXUS | CRM - Pipeline de Vendas e Automação Comercial" },
        { name: "description", content: description },
        { property: "og:title", content: "FLEXUS | CRM - Pipeline de Vendas e Automação Comercial" },
        { property: "og:description", content: `Pipeline kanban, automações e relatórios de conversão para times comerciais. ${priceSentence}` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: "https://xfts-flexus.com/produtos/flexus-crm" },
        { property: "og:image", content: heroCrm },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "FLEXUS | CRM - Pipeline de Vendas e Automação Comercial" },
        { name: "twitter:description", content: "Pipeline kanban, automações e relatórios de conversão para times comerciais." },
        { name: "twitter:image", content: heroCrm },
      ],
      links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/flexus-crm" }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | CRM",
          description: "CRM SaaS de vendas multi-segmento com pipeline kanban e automações.",
          path: "/produtos/flexus-crm",
          image: heroCrm,
          plans,
        }),
      ],
    };
  },
  component: FlexusCrmPage,
});

const fallbackFeatures = [
  "Pipeline de vendas em kanban",
  "Gestão de leads e oportunidades",
  "Automações de follow-up",
  "Integração com e-mail e WhatsApp",
  "Funil de vendas customizável",
  "Relatórios de conversão e metas",
  "Importação de contatos e formulários",
  "App mobile para vendedores em campo",
];

function FlexusCrmPage() {
  const { product, plans } = Route.useLoaderData();

  return (
    <ProductPageLayout
      productKey="crm"
      app="crm"
      product={product}
      plans={plans}
      fallback={{
        name: "FLEXUS | CRM",
        headline: "FLEXUS | CRM",
        subheadline:
          "CRM completo para vender mais e melhor. Pipeline visual, automações e relatórios em tempo real.",
        description:
          "Tudo que seu time comercial precisa para fechar mais negócios em menos tempo, do primeiro contato ao pós-venda.",
        features: fallbackFeatures,
        plansSubtitle: "Escolha o plano ideal para o seu time de vendas.",
      }}
    />
  );
}
