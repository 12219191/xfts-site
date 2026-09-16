import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminCatalog } from "@/lib/admin-catalog.functions";
import { getEntitlementDefinitions } from "@/lib/admin-entitlements.functions";
import {
  deleteCapability,
  getCapabilities,
  saveCapability,
  setCapabilityEnabled,
} from "@/lib/admin-capabilities.functions";
import type { CatalogProduct } from "@/lib/catalog";
import type { EntitlementDefinition } from "@/lib/entitlements";
import {
  RESOURCE_TYPES,
  SCOPE_LABELS,
  VISIBILITY_SCOPES,
  capabilityCategories,
  type Capability,
  type ResourceType,
  type VisibilityScope,
} from "@/lib/capabilities";

interface FormState {
  key: string;
  name: string;
  description: string;
  category: string;
  requiredEntitlementKey: string;
  visibilityScope: VisibilityScope;
  enabled: boolean;
  sortOrder: string;
  resources: Array<{ resourceType: ResourceType; resourceKey: string }>;
}

const emptyForm: FormState = {
  key: "",
  name: "",
  description: "",
  category: "",
  requiredEntitlementKey: "",
  visibilityScope: "TENANT",
  enabled: true,
  sortOrder: "10",
  resources: [],
};

/** Capabilities de cada produto: funcionalidade real ligada ao entitlement comercial. */
export function CapabilitiesPanel() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [defs, setDefs] = useState<EntitlementDefinition[]>([]);
  const [caps, setCaps] = useState<Capability[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, definitions, capabilities] = await Promise.all([
        getAdminCatalog(),
        getEntitlementDefinitions(),
        getCapabilities({ data: {} }),
      ]);
      setProducts(catalog.products);
      setDefs(definitions);
      setCaps(capabilities);
      setSelected((current) => current || catalog.products[0]?.key || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar capabilities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productCaps = useMemo(
    () => caps.filter((c) => c.productKey === selected),
    [caps, selected],
  );
  const categories = useMemo(() => capabilityCategories(productCaps), [productCaps]);
  const productDefs = useMemo(
    () => defs.filter((d) => d.productKey === selected),
    [defs, selected],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return productCaps.filter((cap) => {
      if (category && cap.category !== category) return false;
      if (!term) return true;
      return (
        cap.name.toLowerCase().includes(term) ||
        cap.key.toLowerCase().includes(term) ||
        cap.category.toLowerCase().includes(term)
      );
    });
  }, [productCaps, search, category]);

  const openEdit = (cap: Capability) => {
    setForm({
      key: cap.key,
      name: cap.name,
      description: cap.description,
      category: cap.category,
      requiredEntitlementKey: cap.requiredEntitlementKey ?? "",
      visibilityScope: cap.visibilityScope,
      enabled: cap.enabled,
      sortOrder: String(cap.sortOrder),
      resources: cap.resources.map((r) => ({
        resourceType: r.resourceType,
        resourceKey: r.resourceKey,
      })),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error("Informe a chave e o nome.");
      return;
    }
    setSaving(true);
    try {
      await saveCapability({
        data: {
          productKey: selected,
          key: form.key.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim() || "geral",
          requiredEntitlementKey: form.requiredEntitlementKey || null,
          visibilityScope: form.visibilityScope,
          enabled: form.enabled,
          sortOrder: Number(form.sortOrder) || 10,
          resources: form.resources,
        },
      });
      toast.success("Capability salva.");
      setDialogOpen(false);
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cap: Capability, enabled: boolean) => {
    try {
      await setCapabilityEnabled({ data: { id: cap.id, enabled } });
      setCaps((list) => list.map((c) => (c.id === cap.id ? { ...c, enabled } : c)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar.");
    }
  };

  const handleDelete = async (cap: Capability) => {
    if (!confirm(`Remover "${cap.name}"? Os sistemas deixam de reconhecer esta capability.`)) return;
    try {
      await deleteCapability({ data: { id: cap.id } });
      toast.success("Capability removida.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando capabilities…
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
            onClick={() => {
              setSelected(product.key);
              setCategory("");
            }}
          >
            {product.name}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Capabilities</h3>
            <p className="text-sm text-muted-foreground">
              Funcionalidades reais do sistema. Os SaaS perguntam por
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">can(&quot;chave&quot;)</code>
              e o Hub resolve com o plano do cliente, a permissão e o escopo.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyForm);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder="Buscar por nome, chave ou categoria"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 divide-y divide-border">
          {visible.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhuma capability encontrada para este filtro.
            </p>
          ) : (
            visible.map((cap) => (
              <div key={cap.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{cap.name}</p>
                    <Badge variant="secondary">{cap.category}</Badge>
                    <Badge variant="outline">{SCOPE_LABELS[cap.visibilityScope]}</Badge>
                    {cap.requiredEntitlementKey ? (
                      <Badge variant="outline">
                        exige: {defs.find((d) => d.productKey === cap.productKey && d.key === cap.requiredEntitlementKey)?.label ?? cap.requiredEntitlementKey}
                      </Badge>
                    ) : (
                      <Badge variant="outline">sem entitlement</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {cap.key}
                    {cap.resources.length
                      ? ` · ${cap.resources.length} recurso(s): ${cap.resources
                          .map((r) => `${r.resourceType}:${r.resourceKey}`)
                          .join(", ")}`
                      : " · sem resources"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cap.enabled}
                    onCheckedChange={(value) => void handleToggle(cap, value)}
                  />
                  <Button size="sm" variant="ghost" onClick={() => openEdit(cap)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(cap)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Capability</DialogTitle>
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
                  placeholder="reports.retention_analysis"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="relatorios"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Retenção e recorrência"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Entitlement exigido</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.requiredEntitlementKey}
                  onChange={(e) => setForm({ ...form, requiredEntitlementKey: e.target.value })}
                >
                  <option value="">Nenhum (não depende do plano)</option>
                  {productDefs.map((def) => (
                    <option key={def.id} value={def.key}>
                      {def.label} ({def.key})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Visibility scope</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.visibilityScope}
                  onChange={(e) =>
                    setForm({ ...form, visibilityScope: e.target.value as VisibilityScope })
                  }
                >
                  {VISIBILITY_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {SCOPE_LABELS[scope]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Ordem</Label>
                <Input
                  value={form.sortOrder}
                  inputMode="numeric"
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(value) => setForm({ ...form, enabled: value })}
                />
                <span className="text-sm text-foreground">Ativa</span>
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Label>Resources protegidos</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      resources: [...form.resources, { resourceType: "REPORT", resourceKey: "" }],
                    })
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                </Button>
              </div>
              {form.resources.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum resource cadastrado (opcional).
                </p>
              ) : (
                form.resources.map((res, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      value={res.resourceType}
                      onChange={(e) => {
                        const next = [...form.resources];
                        next[index] = {
                          ...res,
                          resourceType: e.target.value as ResourceType,
                        };
                        setForm({ ...form, resources: next });
                      }}
                    >
                      {RESOURCE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={res.resourceKey}
                      placeholder="retention_analysis"
                      onChange={(e) => {
                        const next = [...form.resources];
                        next[index] = { ...res, resourceKey: e.target.value };
                        setForm({ ...form, resources: next });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          ...form,
                          resources: form.resources.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
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
