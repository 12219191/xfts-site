import { createFileRoute } from "@tanstack/react-router";
import { PRODUCT_IMAGE_DEFAULTS } from "@/lib/product-images";
import { productJsonLd } from "@/lib/product-schema";
import { clinicaPlans as fallbackPlans, lowestMonthlyPrice } from "@/lib/product-plans";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { plansForProduct, canPurchase } from "@/lib/catalog";
import { ProductPageLayout } from "@/components/product/ProductPageLayout";

const heroClinic = PRODUCT_IMAGE_DEFAULTS.clinica;

export const Route = createFileRoute("/produtos/gestao-clinica")({
  loader: async () => {
    const snapshot = await getPublicCatalog();
    return {
      product: snapshot.products.find((p) => p.key === "clinica") ?? null,
      plans: plansForProduct(snapshot, "clinica"),
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
    const description = `Sistema SaaS completo para gestão de consultórios e clínicas: agendamento online, prontuário eletrônico, finanças e relatórios. ${priceSentence}`;
    return {
      meta: [
        { title: "FLEXUS | Clínica - Gestão de Consultórios e Clínicas" },
        { name: "description", content: description },
        { property: "og:title", content: "FLEXUS | Clínica - Gestão de Consultórios e Clínicas" },
        { property: "og:description", content: `Agendamento, prontuário eletrônico e controle financeiro para clínicas. ${priceSentence}` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: "https://xfts-flexus.com/produtos/gestao-clinica" },
        { property: "og:image", content: heroClinic },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "FLEXUS | Clínica - Gestão de Consultórios e Clínicas" },
        { name: "twitter:description", content: "Agendamento, prontuário eletrônico e controle financeiro para clínicas." },
        { name: "twitter:image", content: heroClinic },
      ],
      links: [{ rel: "canonical", href: "https://xfts-flexus.com/produtos/gestao-clinica" }],
      scripts: [
        productJsonLd({
          name: "FLEXUS | Clínica",
          description: "Sistema SaaS de gestão para consultórios e clínicas.",
          path: "/produtos/gestao-clinica",
          image: heroClinic,
          plans,
        }),
      ],
    };
  },
  component: GestaoClinicaPage,
});

const fallbackFeatures = [
  "Agendamento online inteligente",
  "Prontuário eletrônico completo",
  "Controle financeiro integrado",
  "Relatórios e dashboards analíticos",
  "Gestão de equipe e profissionais",
  "Notificações automáticas para pacientes",
  "Emissão de recibos e notas",
  "Integração com convênios",
];

function GestaoClinicaPage() {
  const { product, plans } = Route.useLoaderData();

  return (
    <ProductPageLayout
      productKey="clinica"
      app="clinica"
      product={product}
      plans={plans}
      fallback={{
        name: "FLEXUS | Clínica",
        headline: "FLEXUS | Clínica Completo",
        subheadline:
          "Sistema SaaS para otimizar agendamentos, prontuários e finanças da sua clínica.",
        description:
          "Sistema completo para consultórios e clínicas: agendamentos, prontuários eletrônicos e controle financeiro em um só lugar.",
        features: fallbackFeatures,
        plansSubtitle: "Escolha o plano ideal para o seu consultório ou clínica.",
      }}
    />
  );
}
