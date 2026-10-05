import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { formatBRL, tiersForProduct, type CatalogPlan } from "@/lib/catalog";
import { saveCatalogPlan } from "@/lib/admin-catalog.functions";
import { getEntitlementDefinitions } from "@/lib/admin-entitlements.functions";
import type { EntitlementDefinition, EntitlementMap } from "@/lib/entitlements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productKey: string;
  productName: string;
  plan: CatalogPlan | null;
  environment: "sandbox" | "live";
  onSaved: () => void;
}

const emptyForm = {
  name: "",
  tier: "basico" as CatalogPlan["tier"],
  description: "",
  priceMonth: "",
  priceYear: "",
  features: "",
  seats: "",
  ctaLabel: "Começar Agora",
  priceLookupKey: "",
  annualLookupKey: "",
  active: true,
  sortOrder: "1",
  trialDays: "0",
};

function toCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return Math.round(Number(normalized || 0) * 100);
}

export function CatalogPlanDialog({
  open,
  onOpenChange,
  productKey,
  productName,
  plan,
  environment,
  onSaved,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [syncStripe, setSyncStripe] = useState(true);
  const [defs, setDefs] = useState<EntitlementDefinition[]>([]);
  const [ents, setEnts] = useState<EntitlementMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setForm({
        name: plan.name,
        tier: plan.tier,
        description: plan.description,
        priceMonth: (plan.priceMonthCents / 100).toString(),
        priceYear: plan.priceYearCents ? (plan.priceYearCents / 100).toString() : "",
        features: plan.features.join("\n"),
        seats: plan.seats?.toString() ?? "",
        ctaLabel: plan.ctaLabel,
        priceLookupKey: plan.priceLookupKey ?? "",
        annualLookupKey: plan.annualLookupKey ?? "",
        active: plan.active,
        sortOrder: plan.sortOrder.toString(),
        trialDays: String(plan.trialDays ?? 0),
      });
    } else {
      setForm({ ...emptyForm, tier: tiersForProduct(productKey)[0] as CatalogPlan["tier"] });
    }
    setEnts({ ...(plan?.entitlements ?? {}) });
    setSyncStripe(true);
  }, [open, plan, productKey]);

  const tierOptions = tiersForProduct(productKey);
  const tierInvalid = !tierOptions.includes(form.tier);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getEntitlementDefinitions()
      .then((all) => {
        if (alive) setDefs(all.filter((d) => d.productKey === productKey));
      })
      .catch(() => setDefs([]));
    return () => {
      alive = false;
    };
  }, [open, productKey]);

  const priceMonthCents = toCents(form.priceMonth);
  const priceYearCents = form.priceYear ? toCents(form.priceYear) : null;
  const priceChanged =
    !plan ||
    plan.priceMonthCents !== priceMonthCents ||
    (plan.priceYearCents ?? null) !== priceYearCents;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveCatalogPlan({
        data: {
          ...(plan ? { id: plan.id } : {}),
          productKey,
          name: form.name.trim(),
          tier: form.tier,
          description: form.description.trim(),
          priceMonthCents,
          priceYearCents,
          features: form.features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          seats: form.seats ? Number(form.seats) : null,
          ctaLabel: form.ctaLabel.trim() || "Começar Agora",
          priceLookupKey: form.priceLookupKey.trim() || null,
          annualLookupKey: form.annualLookupKey.trim() || null,
          active: form.active,
          sortOrder: Number(form.sortOrder) || 1,
          trialDays: Number(form.trialDays) || 0,
          entitlements: ents,
          syncStripe: syncStripe && priceChanged,
          environment,
        },
      });
      toast.success(
        result.synced.length
          ? `Plano salvo. Preços atualizados: ${result.synced.join(", ")}`
          : "Plano salvo.",
      );
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar o plano.");
    } finally {
      setSaving(false);
    }
  };

  const previewFeatures = form.features.split("\n").map((f) => f.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? `Editar ${plan.name}` : "Novo plano"}</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Tier</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value as CatalogPlan["tier"] })}
                >
                  {tierInvalid && <option value={form.tier}>{form.tier} (inválido)</option>}
                  {tierOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {tierInvalid && (
                  <p className="text-xs text-destructive">Tier não pertence a este produto.</p>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Preço mensal (R$)</Label>
                <Input
                  value={form.priceMonth}
                  onChange={(e) => setForm({ ...form, priceMonth: e.target.value })}
                  inputMode="decimal"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Preço anual (R$)</Label>
                <Input
                  value={form.priceYear}
                  onChange={(e) => setForm({ ...form, priceYear: e.target.value })}
                  inputMode="decimal"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Usuários inclusos</Label>
                <Input
                  value={form.seats}
                  onChange={(e) => setForm({ ...form, seats: e.target.value })}
                  inputMode="numeric"
                  placeholder="ilimitado"
                />
              </div>
            </div>

            <div className="grid gap-1.5 sm:max-w-[220px]">
              <Label>Dias de teste grátis</Label>
              <Input
                value={form.trialDays}
                onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                inputMode="numeric"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Aplicado só na primeira contratação deste sistema. 0 desativa o teste.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label>Recursos (um por linha)</Label>
              <Textarea
                rows={6}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">Entitlements do plano</p>
              <p className="text-xs text-muted-foreground">
                Define o que este plano libera. É aplicado automaticamente no acesso do cliente
                (hub, SSO e sistemas FLEXUS).
              </p>
              {defs.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Nenhum recurso configurado para este produto. Cadastre em Produtos → Entitlements.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {defs.map((def) => {
                    const value = ents[def.key];
                    if (def.kind === "feature") {
                      return (
                        <div key={def.key} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-foreground">{def.label}</p>
                            <p className="text-xs text-muted-foreground">{def.key}</p>
                          </div>
                          <Switch
                            checked={value === true}
                            onCheckedChange={(v) => setEnts({ ...ents, [def.key]: v })}
                          />
                        </div>
                      );
                    }
                    const unlimited = value === null;
                    return (
                      <div key={def.key} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-foreground">{def.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {def.key}
                            {def.unit ? ` · ${def.unit}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24"
                            inputMode="numeric"
                            disabled={unlimited}
                            value={unlimited || value === undefined ? "" : String(value)}
                            onChange={(e) =>
                              setEnts({
                                ...ents,
                                [def.key]: e.target.value === "" ? 0 : Number(e.target.value),
                              })
                            }
                            placeholder="0"
                          />
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Switch
                              checked={unlimited}
                              onCheckedChange={(v) => setEnts({ ...ents, [def.key]: v ? null : 0 })}
                            />
                            ilimitado
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Lookup key mensal</Label>
                <Input
                  value={form.priceLookupKey}
                  onChange={(e) => setForm({ ...form, priceLookupKey: e.target.value })}
                  placeholder="vazio = plano de consultor"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Lookup key anual</Label>
                <Input
                  value={form.annualLookupKey}
                  onChange={(e) => setForm({ ...form, annualLookupKey: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Texto do botão</Label>
                <Input
                  value={form.ctaLabel}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Ordem</Label>
                <Input
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Plano ativo</p>
                <p className="text-xs text-muted-foreground">Planos inativos somem do site.</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Atualizar preços no provedor ({environment})
                </p>
                <p className="text-xs text-muted-foreground">
                  {priceChanged
                    ? "O preço mudou: será criado um preço novo e o antigo arquivado. Assinantes atuais não são afetados."
                    : "Nenhuma mudança de preço detectada."}
                </p>
              </div>
              <Switch checked={syncStripe} onCheckedChange={setSyncStripe} disabled={!priceChanged} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pré-visualização</p>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-foreground">{form.name || "Plano"}</h4>
                <Badge variant="secondary">{form.tier}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
              <p className="mt-4 text-3xl font-bold text-foreground">
                {formatBRL(priceMonthCents)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              {priceYearCents ? (
                <p className="text-xs text-muted-foreground">
                  Anual: {formatBRL(priceYearCents)}
                </p>
              ) : null}
              <ul className="mt-4 space-y-2">
                {previewFeatures.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cta" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="mt-5 w-full" disabled>
                {form.ctaLabel || "Começar Agora"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
