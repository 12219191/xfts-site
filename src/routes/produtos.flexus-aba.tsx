import { createFileRoute } from "@tanstack/react-router";
import { PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
import { productJsonLd } from "@/lib/product-schema";
import { abaPlans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const heroAba = PRODUCT_IMAGE_DEFAULTS.aba;

export const Route = createFileRoute("/produtos/flexus-aba")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "aba") ?? null,
      plans: plansForProduct(snapshot, "aba"),
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
    const description = `Sistema SaaS para clínicas ABA / TEA: registro de tentativas, PTI, gráficos de evolução e relatórios para convênios. ${priceSentence}`;
    return {
      meta: [
        { title: "FLEXUS | ABA - Sistema para Clínicas de Análise do Comportamento" },
        { name: "description", content: description },
        { property: "og:title", content: "FLEXUS | ABA - Sistema para Clínicas de Análise do Comportamento" },
        { property: "og:description", content: `Registro de tentativas, PTI, gráficos de evolução e relatórios para convênios em clínicas ABA / TEA. ${priceSentence}` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: "https://xfts-flexus.com/produtos/flexus-aba" },
        { property: "og:image", content: heroAba },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "FLEXUS | ABA - Sistema para Clínicas de Análise do Comportamento" },
        { name: "twitter:description", content: "Registro de tentativas, PTI e gráficos de evolução para clínicas ABA / TEA." },
        { name: "twitter:image", content: heroAba },
      ],
      links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/flexus-aba" }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | ABA",
          description: "Sistema SaaS de gestão para clínicas de análise do comportamento aplicada (ABA/TEA).",
          path: "/produtos/flexus-aba",
          image: heroAba,
          plans,
        }),
      ],
    };
  },
  component: FlexusAbaPage,
});

const fallbackFeatures = [
  "Registro de tentativas (DTT) em tempo real",
  "Programas de intervenção personalizados",
  "Gráficos de evolução por objetivo",
  "Plano terapêutico individualizado (PTI)",
  "Agenda de sessões e supervisões",
  "Prontuário multidisciplinar",
  "Relatórios para responsáveis e convênios",
  "Controle de horas autorizadas",
];

function FlexusAbaPage() {
  const { product, plans } = Route.useLoaderData();

  return (
    <ProductPageLayout
      productKey="aba"
      app="aba"
      product={product}
      plans={plans}
      fallback={{
        name: "FLEXUS | ABA",
        headline: "FLEXUS | ABA",
        subheadline:
          "Coleta de dados, PTI e evolução por objetivo para clínicas de análise do comportamento aplicada.",
        description:
          "Sistema para clínicas ABA / TEA: registro de tentativas, planos terapêuticos, supervisão e relatórios prontos para responsáveis e convênios.",
        features: fallbackFeatures,
        plansSubtitle: "Escolha o plano ideal para a sua clínica ABA.",
      }}
    />
  );
}
