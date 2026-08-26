import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminCatalog } from "@/lib/admin-catalog.functions";
import {
  deleteEntitlementDefinition,
  getEntitlementDefinitions,
  saveEntitlementDefinition,
} from "@/lib/admin-entitlements.functions";
import type { CatalogPlan, CatalogProduct } from "@/lib/catalog";
import { formatEntitlementValue, type EntitlementDefinition } from "@/lib/entitlements";

const emptyDef = {
  key: "",
  label: "",
  kind: "feature" as EntitlementDefinition["kind"],
  unit: "",
  description: "",
  sortOrder: "10",
};

/** Gestão dos recursos e limites de cada produto + matriz plano × entitlement. */
export function EntitlementsPanel() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [defs, setDefs] = useState<EntitlementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyDef);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, definitions] = await Promise.all([
        getAdminCatalog(),
        getEntitlementDefinitions(),
      ]);
      setProducts(catalog.products);
      setPlans(catalog.plans);
      setDefs(definitions);
      setSelected((current) => current || catalog.products[0]?.key || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar entitlements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productDefs = useMemo(
    () => defs.filter((d) => d.productKey === selected).sort((a, b) => a.sortOrder - b.sortOrder),
    [defs, selected],
  );
  const productPlans = useMemo(
    () => plans.filter((p) => p.productKey === selected).sort((a, b) => a.sortOrder - b.sortOrder),
    [plans, selected],
  );

  const handleSave = async () => {
    if (!form.key.trim() || !form.label.trim()) {
      toast.error("Informe a chave e o rótulo.");
      return;
    }
    setSaving(true);
    try {
      await saveEntitlementDefinition({
        data: {
          productKey: selected,
          key: form.key.trim(),
          label: form.label.trim(),
          kind: form.kind,
          unit: form.unit.trim(),
          description: form.description.trim(),
          sortOrder: Number(form.sortOrder) || 10,
        },
      });
      toast.success("Entitlement salvo.");
      setDialogOpen(false);
      setForm(emptyDef);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (def: EntitlementDefinition) => {
    if (!confirm(`Remover "${def.label}"? Os planos deixam de exibir este item.`)) return;
    try {
      await deleteEntitlementDefinition({ data: { id: def.id } });
      toast.success("Entitlement removido.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando entitlements…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {products.map((product) => (
          <Button
            key={product.key}
            size="sm"
            variant={product.key === selected ? "default" : "outline"}
            onClick={() => setSelected(product.key)}
          >
            {product.name}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recursos e limites</h3>
            <p className="text-sm text-muted-foreground">
              Definem o que os planos deste produto podem liberar. A aplicação usa estas chaves para
              liberar ou bloquear o acesso do cliente.
            </p>
          </div>
          <Button size="sm" onClick={() => { setForm(emptyDef); setDialogOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo
          </Button>
        </div>

        <div className="mt-4 divide-y divide-border">
          {productDefs.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nenhum recurso cadastrado.</p>
          ) : (
            productDefs.map((def) => (
              <div key={def.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{def.label}</p>
                    <Badge variant="secondary">{def.kind === "limit" ? "limite" : "recurso"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {def.key}
                    {def.unit ? ` · ${def.unit}` : ""}
                    {def.description ? ` — ${def.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm({
                        key: def.key,
                        label: def.label,
                        kind: def.kind,
                        unit: def.unit,
                        description: def.description,
                        sortOrder: String(def.sortOrder),
                      });
                      setDialogOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(def)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground">Matriz por plano</h3>
        <p className="text-sm text-muted-foreground">
          Valores atuais aplicados a cada assinante. Edite em Catálogo → plano.
        </p>
        <table className="mt-4 w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Recurso</th>
              {productPlans.map((plan) => (
                <th key={plan.id} className="py-2 pr-4">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productDefs.map((def) => (
              <tr key={def.id} className="border-b border-border/60">
                <td className="py-2 pr-4 text-foreground">{def.label}</td>
                {productPlans.map((plan) => (
                  <td key={plan.id} className="py-2 pr-4 text-muted-foreground">
                    {formatEntitlementValue(def, plan.entitlements[def.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recurso / limite</DialogTitle>
            <DialogDescription>
              {products.find((p) => p.key === selected)?.name ?? selected}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Chave (técnica)</Label>
                <Input
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="relatorios_avancados"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.kind}
                  onChange={(e) =>
                    setForm({ ...form, kind: e.target.value as EntitlementDefinition["kind"] })
                  }
                >
                  <option value="feature">recurso (liga/desliga)</option>
                  <option value="limit">limite (número)</option>
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Rótulo</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Unidade (limites)</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="usuários"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Ordem</Label>
                <Input
                  value={form.sortOrder}
                  inputMode="numeric"
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
