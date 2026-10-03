import { createFileRoute } from "@tanstack/react-router";
import { productJsonLd } from "@/lib/product-schema";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const TITLE = "FLEXUS | Atende - Atendimento com IA no WhatsApp";
const DESCRIPTION =
  "Atendimento pelo WhatsApp com a API oficial, agentes de IA configuráveis, base de conhecimento própria e caixa de entrada para a equipe. Fale com o nosso time para conhecer.";
const URL = "https://xfts-flexus.com/produtos/flexus-atende";

export const Route = createFileRoute("/produtos/flexus-atende")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "atende") ?? null,
      plans: plansForProduct(snapshot, "atende"),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "product" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      productJsonLd({
        name: "FLEXUS | Atende",
        description: "Atendimento pelo WhatsApp (API oficial) com agentes de IA e caixa de entrada.",
        path: "/produtos/flexus-atende",
        image: loaderData?.product?.imageUrl || "",
        plans: loaderData?.plans ?? [],
      }),
    ],
  }),
  component: FlexusAtendePage,
});

const fallbackFeatures = [
  "Atendimento pelo WhatsApp com a API oficial",
  "Agentes de IA configuráveis",
  "Base de conhecimento própria para os agentes",
  "Caixa de entrada com atendimento humano",
  "Cadastro e histórico de contatos",
  "Equipe com papéis de acesso",
  "Métricas de atendimento e acompanhamento de uso",
];

function FlexusAtendePage() {
  const { product, plans } = Route.useLoaderData();
  return (
    <ProductPageLayout
      productKey="atende"
      app="atende"
      product={product}
      plans={plans}
      contactOnly
      note="Custos separados: a plataforma e o uso da IA têm cobrança própria, e as mensagens do WhatsApp seguem as tarifas da Meta para a API oficial."
      fallback={{
        name: "FLEXUS | Atende",
        headline: "FLEXUS | Atende",
        subheadline:
          "Atenda seus clientes no WhatsApp com agentes de IA e passe para a equipe quando precisar.",
        description:
          "Conecte o WhatsApp pela API oficial, configure agentes de IA com o conhecimento do seu negócio e acompanhe tudo numa caixa de entrada compartilhada.",
        features: fallbackFeatures,
        plansSubtitle: "Planos em definição — fale com o nosso time.",
      }}
    />
  );
}
