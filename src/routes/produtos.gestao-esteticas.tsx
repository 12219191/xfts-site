import { createFileRoute } from "@tanstack/react-router";
import { PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
import { productJsonLd } from "@/lib/product-schema";
import { esteticasPlans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const heroAesthetics = PRODUCT_IMAGE_DEFAULTS.estetica;

export const Route = createFileRoute("/produtos/gestao-esteticas")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "estetica") ?? null,
      plans: plansForProduct(snapshot, "estetica"),
    };
  },
  head: ({ loaderData }) => {
    const plans = loaderData?.plans?.length ? loaderData.plans : fallbackPlans;
    const product = loaderData?.product ?? null;
    const sellable = product ? canPurchase(product) : true;
    const from = lowestMonthlyPrice(plans, "R$ 99");
    const priceSentence = sellable
      ? `Planos a partir de ${from}/mês, no cartão, mensal ou anual.`
      : "Valores sob consulta: fale com o nosso time para receber a proposta.";
    const description = `Sistema SaaS para clínicas de estética e salões: estoque, PDV, pacotes e sessões, comissões e CRM. ${priceSentence}`;
    return {
      meta: [
        { title: "FLEXUS | Estética - Gestão de Clínicas de Estética e Salões" },
        { name: "description", content: description },
        { property: "og:title", content: "FLEXUS | Estética - Gestão de Clínicas de Estética e Salões" },
        { property: "og:description", content: `Estoque, PDV, pacotes, comissões e CRM para estética e salões. ${priceSentence}` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: "https://xfts-flexus.com/produtos/gestao-esteticas" },
        { property: "og:image", content: heroAesthetics },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "FLEXUS | Estética - Gestão de Clínicas de Estética e Salões" },
        { name: "twitter:description", content: "Estoque, PDV, pacotes, comissões e CRM para estética e salões." },
        { name: "twitter:image", content: heroAesthetics },
      ],
      links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/gestao-esteticas" }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | Estética",
          description: "Sistema SaaS de gestão para clínicas de estética e salões de beleza.",
          path: "/produtos/gestao-esteticas",
          image: heroAesthetics,
          plans,
        }),
      ],
    };
  },
  component: GestaoEsteticasPage,
});

const fallbackFeatures = [
  "Controle de estoque de produtos e insumos",
  "PDV integrado com vendas e pacotes",
  "Pacotes e controle de sessões",
  "Agendamento online de procedimentos",
  "Ficha de anamnese e evolução",
  "Gestão de comissões da equipe",
  "CRM e fidelização de clientes",
  "Relatórios financeiros e de performance",
];

function GestaoEsteticasPage() {
  const { product, plans } = Route.useLoaderData();

  return (
    <ProductPageLayout
      productKey="estetica"
      app="estetica"
      product={product}
      plans={plans}
      fallback={{
        name: "FLEXUS | Estética",
        headline: "FLEXUS | Estética e Salões",
        subheadline:
          "Estoque, PDV, pacotes, comissões e CRM para clínicas de estética e salões de beleza.",
        description:
          "Sistema completo para estética: controle de sessões e pacotes, agenda, estoque de insumos, comissões e relacionamento com clientes.",
        features: fallbackFeatures,
        plansSubtitle: "Escolha o plano ideal para a sua clínica ou salão.",
      }}
    />
  );
}
