import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket } from "lucide-react";
import {
  createPromotion,
  listPromotions,
  togglePromotion,
  type PromotionRow,
} from "@/lib/promotions.functions";

type Env = "sandbox" | "live";

const emptyForm = {
  code: "",
  percentOff: "",
  amountOff: "",
  duration: "once" as "once" | "repeating" | "forever",
  durationInMonths: "3",
  maxRedemptions: "",
  expiresInDays: "",
};

export function PromotionsPanel() {
  const [environment, setEnvironment] = useState<Env>("live");
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await listPromotions({ data: { environment } });
    if ("error" in result) {
      setError(result.error);
      setRows([]);
    } else {
      setRows(result.rows);
    }
    setLoading(false);
  }, [environment]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    const result = await createPromotion({
      data: {
        environment,
        code: form.code.trim().toUpperCase(),
        percentOff: form.percentOff ? Number(form.percentOff) : null,
        amountOffCents: form.amountOff
          ? Math.round(Number(form.amountOff.replace(",", ".")) * 100)
          : null,
        duration: form.duration,
        durationInMonths: form.durationInMonths ? Number(form.durationInMonths) : null,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null,
      },
    });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Cupom ${result.code} criado.`);
    setForm(emptyForm);
    load();
  };

  const handleToggle = async (row: PromotionRow) => {
    const result = await togglePromotion({
      data: { environment, id: row.id, active: !row.active },
    });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(row.active ? "Cupom desativado." : "Cupom ativado.");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Promoções</h1>
          <p className="text-sm text-muted-foreground">
            Cupons de desconto aceitos no checkout — úteis para beta testers, campanhas e
            reativação.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["live", "sandbox"] as Env[]).map((env) => (
            <button
              key={env}
              onClick={() => setEnvironment(env)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                environment === env
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {env === "live" ? "Produção" : "Testes"}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-3 lg:grid-cols-6">
          <div className="grid gap-1.5">
            <Label>Código</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="BETA30"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Desconto (%)</Label>
            <Input
              value={form.percentOff}
              onChange={(e) => setForm({ ...form, percentOff: e.target.value, amountOff: "" })}
              inputMode="numeric"
              placeholder="30"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>ou valor (R$)</Label>
            <Input
              value={form.amountOff}
              onChange={(e) => setForm({ ...form, amountOff: e.target.value, percentOff: "" })}
              inputMode="decimal"
              placeholder="50,00"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Duração</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={form.duration}
              onChange={(e) =>
                setForm({ ...form, duration: e.target.value as typeof form.duration })
              }
            >
              <option value="once">Primeira cobrança</option>
              <option value="repeating">Alguns meses</option>
              <option value="forever">Para sempre</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>{form.duration === "repeating" ? "Meses" : "Usos máx."}</Label>
            <Input
              value={form.duration === "repeating" ? form.durationInMonths : form.maxRedemptions}
              onChange={(e) =>
                setForm(
                  form.duration === "repeating"
                    ? { ...form, durationInMonths: e.target.value }
                    : { ...form, maxRedemptions: e.target.value },
                )
              }
              inputMode="numeric"
              placeholder={form.duration === "repeating" ? "3" : "ilimitado"}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleCreate}
              disabled={saving || !form.code.trim()}
              className="w-full bg-primary text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar cupom"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando cupons...
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center p-10 text-center text-muted-foreground">
              <Ticket className="h-8 w-8 opacity-30" />
              <p className="mt-2 text-sm">Nenhum cupom criado neste ambiente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Desconto</th>
                    <th className="px-4 py-3">Duração</th>
                    <th className="px-4 py-3">Usos</th>
                    <th className="px-4 py-3">Validade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="px-4 py-3 font-medium text-foreground">{row.code}</td>
                      <td className="px-4 py-3">{row.desconto}</td>
                      <td className="px-4 py-3">{row.duracao}</td>
                      <td className="px-4 py-3">
                        {row.timesRedeemed}
                        {row.maxRedemptions ? ` / ${row.maxRedemptions}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {row.expiresAt
                          ? new Date(row.expiresAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={row.active ? "default" : "secondary"}>
                          {row.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleToggle(row)}>
                          {row.active ? "Desativar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
