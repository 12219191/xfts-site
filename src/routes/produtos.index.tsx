import { createFileRoute } from "@tanstack/react-router";
import { ProdutosIndex } from "./produtos";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { softwareAppsJsonLd } from "@/lib/structured-data";

export const Route = createFileRoute("/produtos/")({
  head: () => ({
    meta: [
      { title: "Sistemas FLEXUS para seu negócio | XFTS" },
      { name: "description", content: "Conheça os sistemas FLEXUS para Barbearia, Estética, Atende, CRM, Casa360°, Clínica e ABA." },
      { property: "og:title", content: "Sistemas FLEXUS para seu negócio | XFTS" },
      { property: "og:description", content: "Compare as soluções de gestão FLEXUS e encontre o sistema para seu negócio ou sua casa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [softwareAppsJsonLd()],
  }),
  loader: () => getPublicCatalog(),
  errorComponent: ({ error }) => (
    <div className="section-padding container-wide text-sm text-muted-foreground" role="alert">
      Não foi possível carregar os produtos. {error instanceof Error ? error.message : ""}
    </div>
  ),
  notFoundComponent: () => (
    <div className="section-padding container-wide text-sm text-muted-foreground">
      Nenhum produto disponível no momento.
    </div>
  ),
  component: ProdutosIndexRoute,
});

function ProdutosIndexRoute() {
  const data = Route.useLoaderData();
  const products = data.products
    .filter((p) => p.showOnWebsite)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return <ProdutosIndex products={products} />;
}
