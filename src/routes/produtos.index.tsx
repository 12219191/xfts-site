import { createFileRoute } from "@tanstack/react-router";
import { ProdutosIndex } from "./produtos";

export const Route = createFileRoute("/produtos/")({
  component: ProdutosIndex,
});
