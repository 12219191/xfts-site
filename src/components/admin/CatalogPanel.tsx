import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  formatBRL,
  statusLabel,
  type CatalogPlan,
  type CatalogProduct,
  type ProductStatus,
} from "@/lib/catalog";
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
          <Button size="sm" onClick={() => setProductDialog(emptyProduct(products.length + 1))}>
            <Plus className="mr-2 h-4 w-4" /> Novo produto
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
                <Badge variant={product.status === "active" ? "default" : "secondary"}>
                  {statusLabel(product.status)}
                </Badge>
                <Badge variant={product.showOnWebsite ? "outline" : "destructive"}>
                  {product.showOnWebsite ? "No site" : "Oculto no site"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {productPlans.length} plano(s)
                </span>
                {product.showOnWebsite &&
                  product.status !== "development" &&
                  productPlans.filter((p) => p.active).length === 0 && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" /> visível no site sem plano ativo
                    </span>
                  )}
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

const STATUS_OPTIONS: { value: ProductStatus; help: string }[] = [
  { value: "active", help: "Disponível normalmente: aparece, vende e libera acesso." },
  { value: "beta", help: "Disponível com selo Beta: vende e libera acesso." },
  { value: "development", help: "Em desenvolvimento: aparece como “Em breve”, sem preço, sem acesso." },
  { value: "paused", help: "Temporariamente indisponível: não vende; assinantes atuais continuam entrando." },
  { value: "discontinued", help: "Descontinuado: não vende; assinantes atuais continuam entrando." },
];

export function emptyProduct(sortOrder: number): CatalogProduct {
  return {
    key: "",
    name: "",
    url: "",
    landing: "",
    pricePrefix: "",
    available: false,
    sortOrder,
    status: "development",
    showOnWebsite: false,
    availableForPurchase: false,
    availableInHub: false,
    betaNote: "",

    displayName: "",
    shortDescription: "",
    headline: "",
    subheadline: "",
    icon: "Sparkles",
    ctaLabel: "Saiba Mais",
    ctaHref: "",
    imageUrl: "",
    imageAlt: "",
  };
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
  const isNew = !product?.key;

  const save = async () => {
    setSaving(true);
    try {
      await saveCatalogProduct({
        data: {
          key: form.key.trim(),
          name: form.name.trim(),
          url: form.url.trim(),
          landing: form.landing.trim(),
          pricePrefix: form.pricePrefix.trim(),
          sortOrder: form.sortOrder,
          status: form.status,
          showOnWebsite: form.showOnWebsite,
          availableForPurchase: form.availableForPurchase,
          availableInHub: form.availableInHub,
          betaNote: form.betaNote,

          displayName: form.displayName,
          shortDescription: form.shortDescription,
          headline: form.headline,
          subheadline: form.subheadline,
          icon: form.icon,
          ctaLabel: form.ctaLabel,
          ctaHref: form.ctaHref,
          imageUrl: form.imageUrl,
          imageAlt: form.imageAlt,
        },
      });
      toast.success("Produto salvo.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  const statusHelp = STATUS_OPTIONS.find((o) => o.value === form.status)?.help ?? "";
  const preview = siteCta(form);
  const coherenceWarnings: string[] = [];
  if (form.availableForPurchase && !statusAllowsPurchase(form.status)) {
    coherenceWarnings.push(
      `“Pode ser contratado” está ligado, mas o status “${statusLabel(
        form.status,
      )}” não permite vender — o status vence e a venda continua bloqueada.`,
    );
  }
  if (form.availableInHub && !statusAllowsAccess(form.status)) {
    coherenceWarnings.push(
      "“Aparece no Hub” está ligado, mas produtos em desenvolvimento não liberam acesso.",
    );
  }
  if (canPurchase(form) && !form.availableInHub) {
    coherenceWarnings.push(
      "O produto pode ser contratado mas não aparece no Hub: quem comprar ficará sem porta de entrada.",
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo produto" : "Editar produto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Chave do sistema</Label>
                <Input
                  value={form.key}
                  disabled={!isNew}
                  placeholder="ex.: barbearia"
                  onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Nome interno</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Status do produto</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {statusLabel(o.value)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{statusHelp}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm text-foreground">Mostrar no site</p>
                <p className="text-xs text-muted-foreground">
                  Independente do status. Desligado, o produto some das páginas públicas.
                </p>
              </div>
              <Switch
                checked={form.showOnWebsite}
                onCheckedChange={(v) => setForm({ ...form, showOnWebsite: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm text-foreground">Pode ser contratado</p>
                <p className="text-xs text-muted-foreground">
                  Libera o botão de compra e o checkout. Só vale em produtos disponíveis
                  ou em acesso antecipado.
                </p>
              </div>
              <Switch
                checked={form.availableForPurchase}
                onCheckedChange={(v) => setForm({ ...form, availableForPurchase: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm text-foreground">Aparece no Hub</p>
                <p className="text-xs text-muted-foreground">
                  Mostra o sistema em “Meus Sistemas” e libera SSO e provisionamento.
                </p>
              </div>
              <Switch
                checked={form.availableInHub}
                onCheckedChange={(v) => setForm({ ...form, availableInHub: v })}
              />
            </div>

            {coherenceWarnings.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {coherenceWarnings.map((w) => (
                  <li key={w} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Prévia no site: </span>
              {form.showOnWebsite ? (
                <>
                  {preview.badge ? `selo “${preview.badge}” · ` : ""}
                  botão “{preview.label}”
                  {preview.showPricing ? " com preços" : " sem preços"}
                  {preview.notice ? ` · ${preview.notice}` : ""}
                </>
              ) : (
                "oculto nas páginas públicas."
              )}
            </div>



            {form.status === "beta" && (
              <div className="grid gap-1.5">
                <Label>Aviso do beta</Label>
                <Input
                  value={form.betaNote}
                  placeholder="Ex.: vagas limitadas para o grupo beta"
                  onChange={(e) => setForm({ ...form, betaNote: e.target.value })}
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Título no site</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Ícone (lucide)</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Descrição curta (card)</Label>
              <Textarea
                rows={3}
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Headline da landing</Label>
                <Input
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Subtítulo da landing</Label>
                <Input
                  value={form.subheadline}
                  onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Rótulo do botão</Label>
                <Input
                  value={form.ctaLabel}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Destino do botão</Label>
                <Input
                  value={form.ctaHref}
                  placeholder="/produtos/..."
                  onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Imagem (URL)</Label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Texto alternativo</Label>
                <Input
                  value={form.imageAlt}
                  onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Prefixo de preço</Label>
                <Input
                  value={form.pricePrefix}
                  onChange={(e) => setForm({ ...form, pricePrefix: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Prévia do card</p>
            <Card className="overflow-hidden border-border bg-card">
              {form.imageUrl ? (
                <div className="aspect-video overflow-hidden">
                  <img src={form.imageUrl} alt={form.imageAlt} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">
                  imagem padrão do sistema
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-card-foreground">
                    {form.displayName || form.name || "Nome do produto"}
                  </h4>
                  {form.status !== "active" && (
                    <Badge variant="secondary">{statusLabel(form.status)}</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {form.shortDescription || "Descrição curta do produto."}
                </p>
                <Button size="sm" className="mt-3 bg-cta text-cta-foreground hover:bg-cta/90">
                  {form.ctaLabel || "Saiba Mais"}
                </Button>
              </CardContent>
            </Card>
            {!form.showOnWebsite && (
              <p className="text-xs text-muted-foreground">
                Este produto não aparece no site enquanto “Mostrar no site” estiver desligado.
              </p>
            )}
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
