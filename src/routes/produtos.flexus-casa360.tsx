import { createFileRoute } from "@tanstack/react-router";
import { PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
import { productJsonLd } from "@/lib/product-schema";
import { casa360Plans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const heroCasa360 = PRODUCT_IMAGE_DEFAULTS.casa360;

export const Route = createFileRoute("/produtos/flexus-casa360")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "casa360") ?? null,
      plans: plansForProduct(snapshot, "casa360"),
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
    const description = `ERP doméstico com estoque da despensa, lista de compras automática, controle de validade e finanças da casa. ${priceSentence}`;
    return {
      meta: [
        { title: "FLEXUS | Casa360° - ERP Doméstico para sua Casa" },
        { name: "description", content: description },
        { property: "og:title", content: "FLEXUS | Casa360° - ERP Doméstico para sua Casa" },
        { property: "og:description", content: `Estoque, compras e finanças da sua casa em um só lugar. ${priceSentence}` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: "https://xfts-flexus.com/produtos/flexus-casa360" },
        { property: "og:image", content: heroCasa360 },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "FLEXUS | Casa360° - ERP Doméstico para sua Casa" },
        { name: "twitter:description", content: "Estoque, compras e finanças da sua casa em um só lugar." },
        { name: "twitter:image", content: heroCasa360 },
      ],
      links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/flexus-casa360" }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | Casa360°",
          description: "ERP doméstico para estoque, compras e finanças da casa.",
          path: "/produtos/flexus-casa360",
          image: heroCasa360,
          plans,
        }),
      ],
    };
  },
  component: FlexusCasa360Page,
});

const fallbackFeatures = [
  "Estoque da despensa, geladeira e armário",
  "Controle de validade com alertas",
  "Lista de compras automática",
  "Histórico e comparação de preços",
  "Receitas, despesas e categorias do mês",
  "Contas recorrentes e lembretes",
  "Painel Visão da Casa",
  "Vários moradores na mesma casa",
];

function FlexusCasa360Page() {
  const { product, plans } = Route.useLoaderData();

  return (
    <ProductPageLayout
      productKey="casa360"
      app="casa360"
      product={product}
      plans={plans}
      fallback={{
        name: "FLEXUS | Casa360°",
        headline: "FLEXUS | Casa360°",
        subheadline:
          "O ERP da sua casa: estoque, compras e finanças em um só lugar, para toda a família.",
        description:
          "Chega de comprar duplicado ou perder validade: acompanhe o que tem em casa, monte a lista de compras sozinho e feche o mês sabendo para onde foi o dinheiro.",
        features: fallbackFeatures,
        plansSubtitle: "Escolha o plano ideal para a sua casa.",
      }}
    />
  );
}
