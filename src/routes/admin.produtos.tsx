import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImagesPanel } from "@/components/admin/ProductImagesPanel";
import { CatalogPanel } from "@/components/admin/CatalogPanel";
import { EntitlementsPanel } from "@/components/admin/EntitlementsPanel";
import { ModuleGuard } from "@/components/admin/admin-context";

export const Route = createFileRoute("/admin/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  return (
    <ModuleGuard module="produtos">
      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-6">
          <CatalogPanel />
        </TabsContent>

        <TabsContent value="entitlements" className="mt-6">
          <EntitlementsPanel />
        </TabsContent>

        <TabsContent value="imagens" className="mt-6">
          <ProductImagesPanel />
        </TabsContent>
      </Tabs>
    </ModuleGuard>
  );
}
