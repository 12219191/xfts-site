import { createFileRoute } from "@tanstack/react-router";
import { ProdutosIndex } from "./produtos";
import { getPublicCatalog } from "@/lib/catalog.functions";

export const Route = createFileRoute("/produtos/")({
  loader: () => getPublicCatalog(),
  errorComponent: ({ error }) => (
    <div className="section-padding container-wide text-sm text-muted-foreground" role="alert">
      Não foi possível carregar os produtos. {error.message}
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
