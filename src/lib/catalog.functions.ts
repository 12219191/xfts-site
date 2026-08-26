import { createServerFn } from "@tanstack/react-start";
import type { CatalogSnapshot } from "@/lib/catalog";

/** Catálogo público (produtos + planos ativos) para as páginas do site. */
export const getPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogSnapshot> => {
    const { loadPublicCatalog } = await import("@/lib/catalog.server");
    return loadPublicCatalog();
  },
);
