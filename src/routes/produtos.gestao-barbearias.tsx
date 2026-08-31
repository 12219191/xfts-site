import { createFileRoute } from "@tanstack/react-router";
import { PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
import { productJsonLd } from "@/lib/product-schema";
import { barbeariasPlans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const heroBarbershop = PRODUCT_IMAGE_DEFAULTS.barbearia;

export const Route = createFileRoute("/produtos/gestao-barbearias")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "barbearia") ?? null,
      plans: plansForProduct(snapshot, "barbearia"),
    };
  },
  head: ({ loaderData }) => {
    const plans = loaderData?.plans?.length ? loaderData.plans : fallbackPlans;
    const from = lowestMonthlyPrice(plans, "R$ 99");
    const description = `Sistema SaaS para barbearias e salões: PDV, estoque, agendamento online, comissões e CRM. Planos a partir de ${from}/mês, no cartão, mensal ou anual.`;
    return {
      meta: [
        { title: "FLEXUS | Barbearia - Gestão de Barbearias e Salões" },
        { name: "description", content: description },
        { property: "og:title", content: "FLEXUS | Barbearia - Gestão de Barbearias e Salões" },
        { property: "og:description", content: `PDV, estoque, agendamento, comissões e CRM para barbearias. Planos a partir de ${from}/mês.` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: "https://xfts-flexus.com/produtos/gestao-barbearias" },
        { property: "og:image", content: heroBarbershop },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "FLEXUS | Barbearia - Gestão de Barbearias e Salões" },
        { name: "twitter:description", content: "PDV, estoque, agendamento, comissões e CRM para barbearias." },
        { name: "twitter:image", content: heroBarbershop },
      ],
      links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/gestao-barbearias" }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | Barbearia",
          description: "Sistema SaaS de gestão para barbearias e salões masculinos.",
          path: "/produtos/gestao-barbearias",
          image: heroBarbershop,
          plans,
        }),
      ],
    };
  },
  component: GestaoBarbeariasPage,
});

const fallbackFeatures = [
  "Controle de estoque inteligente",
  "PDV integrado com vendas",
  "CRM e fidelização de clientes",
  "Agendamento online",
  "Gestão de comissões",
  "Relatórios de performance",
  "Controle de caixa",
  "Notificações por WhatsApp",
];

function GestaoBarbeariasPage() {
  const { product, plans } = Route.useLoaderData();

  return (
    <ProductPageLayout
      productKey="barbearia"
      app="barbearia"
      product={product}
      plans={plans}
      fallback={{
        name: "FLEXUS | Barbearia",
        headline: "FLEXUS | Barbearia e Salões",
        subheadline: "Estoque, vendas, PDV e CRM em uma única plataforma inteligente.",
        description:
          "Controle de estoque, vendas, PDV, agendamento e CRM para barbearias e salões masculinos.",
        features: fallbackFeatures,
        plansSubtitle: "Escolha o plano ideal para sua barbearia ou rede.",
      }}
    />
  );
}
