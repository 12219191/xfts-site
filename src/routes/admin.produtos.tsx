import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImagesPanel } from "@/components/admin/ProductImagesPanel";
import { ModuleGuard } from "@/components/admin/admin-context";
import { FLEXUS_APPS } from "@/lib/flexus-apps";
import { PLANS_BY_APP } from "@/lib/product-plans";

export const Route = createFileRoute("/admin/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  return (
    <ModuleGuard module="produtos">
      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Visão somente leitura do catálogo publicado. Alterações de plano e preço ainda são
            feitas no código e no provedor de pagamento.
          </p>
          {FLEXUS_APPS.map((app) => (
            <Card key={app.key} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold text-foreground">{app.name}</h3>
                  <Badge variant={app.available ? "default" : "secondary"}>
                    {app.available ? "Disponível" : "Em breve"}
                  </Badge>
                  {app.url && (
                    <span className="text-xs text-muted-foreground">{app.url}</span>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {(PLANS_BY_APP[app.key] ?? []).map((plan) => (
                    <div key={plan.name} className="rounded-lg border border-border p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-foreground">{plan.name}</span>
                        <span className="text-sm text-foreground">{plan.price}/mês</span>
                      </div>
                      {plan.annualPrice && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Anual: {plan.annualPrice}
                        </p>
                      )}
                      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                        {plan.priceId ?? "sem checkout (consultor)"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="imagens" className="mt-6">
          <ProductImagesPanel />
        </TabsContent>
      </Tabs>
    </ModuleGuard>
  );
}
