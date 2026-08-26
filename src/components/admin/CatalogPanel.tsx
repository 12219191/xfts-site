import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Check, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { formatBRL, type CatalogPlan, type CatalogProduct } from "@/lib/catalog";
import {
  checkCatalogPrices,
  deleteCatalogPlan,
  getAdminCatalog,
  saveCatalogProduct,
} from "@/lib/admin-catalog.functions";
import type { PriceCheck } from "@/lib/catalog-stripe.server";
import { CatalogPlanDialog } from "@/components/admin/CatalogPlanDialog";

export function CatalogPanel() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [environment, setEnvironment] = useState<"sandbox" | "live">("live");
  const [checks, setChecks] = useState<PriceCheck[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [planDialog, setPlanDialog] = useState<{
    productKey: string;
    productName: string;
    plan: CatalogPlan | null;
  } | null>(null);
  const [productDialog, setProductDialog] = useState<CatalogProduct | null>(null);
  const [deleting, setDeleting] = useState<CatalogPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminCatalog();
      setProducts(data.products);
      setPlans(data.plans);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar o catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runCheck = async () => {
    setChecking(true);
    try {
      setChecks(await checkCatalogPrices({ data: { environment } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na conferência de preços.");
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCatalogPlan({ data: { id: deleting.id } });
      toast.success("Plano removido.");
      setDeleting(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover o plano.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando catálogo...
      </div>
    );
  }

  const divergent = checks?.filter((c) => !c.ok) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Catálogo editável. Alterar um preço cria um preço novo no provedor de pagamento e
          arquiva o antigo — assinantes atuais mantêm o valor contratado.
        </p>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as "sandbox" | "live")}
          >
            <option value="live">Live</option>
            <option value="sandbox">Sandbox</option>
          </select>
          <Button size="sm" variant="outline" onClick={runCheck} disabled={checking}>
            {checking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Conferir preços
          </Button>
        </div>
      </div>

      {checks && (
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              {divergent.length === 0 ? (
                <>
                  <Check className="h-4 w-4 text-cta" />
                  <p className="text-sm text-foreground">
                    Todos os {checks.length} preços conferem com o provedor ({environment}).
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-foreground">
                    {divergent.length} preço(s) divergentes — edite o plano e salve para
                    reenviar.
                  </p>
                </>
              )}
            </div>
            {divergent.length > 0 && (
              <div className="mt-3 space-y-1">
                {divergent.map((c) => (
                  <p key={c.lookupKey} className="font-mono text-xs text-muted-foreground">
                    {c.lookupKey}: banco {formatBRL(c.expectedCents)} × provedor{" "}
                    {c.stripeCents === null ? "não encontrado" : formatBRL(c.stripeCents)}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {products.map((product) => {
        const productPlans = plans
          .filter((p) => p.productKey === product.key)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <Card key={product.key} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-foreground">{product.name}</h3>
                <Badge variant={product.available ? "default" : "secondary"}>
                  {product.available ? "Disponível" : "Em breve"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {productPlans.length} plano(s)
                </span>
                {product.url && (
                  <span className="text-xs text-muted-foreground">{product.url}</span>
                )}
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setProductDialog(product)}>
                    <Pencil className="mr-2 h-4 w-4" /> Produto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPlanDialog({
                        productKey: product.key,
                        productName: product.name,
                        plan: null,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Plano
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {productPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-3 ${
                      plan.active ? "border-border" : "border-dashed border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{plan.name}</span>
                      <span className="text-sm text-foreground">
                        {formatBRL(plan.priceMonthCents)}/mês
                      </span>
                    </div>
                    {plan.priceYearCents ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Anual: {formatBRL(plan.priceYearCents)}
                      </p>
                    ) : null}
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                      {plan.priceLookupKey ?? "sem checkout (consultor)"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPlanDialog({
                            productKey: product.key,
                            productName: product.name,
                            plan,
                          })
                        }
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleting(plan)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {planDialog && (
        <CatalogPlanDialog
          open
          onOpenChange={(open) => !open && setPlanDialog(null)}
          productKey={planDialog.productKey}
          productName={planDialog.productName}
          plan={planDialog.plan}
          environment={environment}
          onSaved={load}
        />
      )}

      <ProductDialog
        product={productDialog}
        onClose={() => setProductDialog(null)}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover plano</AlertDialogTitle>
            <AlertDialogDescription>
              O plano "{deleting?.name}" sai do catálogo e do site. Os preços no provedor de
              pagamento não são apagados. Prefira desativar se houver assinantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: CatalogProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CatalogProduct | null>(product);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(product), [product]);

  if (!form) return null;

  const save = async () => {
    setSaving(true);
    try {
      await saveCatalogProduct({ data: form });
      toast.success("Produto salvo.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Domínio do sistema</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rota da landing</Label>
            <Input
              value={form.landing}
              onChange={(e) => setForm({ ...form, landing: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Prefixo de preço</Label>
            <Input
              value={form.pricePrefix}
              onChange={(e) => setForm({ ...form, pricePrefix: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm text-foreground">Disponível</span>
            <Switch
              checked={form.available}
              onCheckedChange={(v) => setForm({ ...form, available: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
