import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, RefreshCw, XCircle } from "lucide-react";
import { FLEXUS_APPS } from "@/lib/flexus-apps";
import { courtesyTiersForProduct } from "@/lib/catalog";
import { getStripeEnvironment } from "@/lib/stripe";
import { grantCourtesy, listCourtesy, revokeCourtesy, type CourtesyRow } from "@/lib/courtesy.functions";

const TIER_LABELS: Record<string, string> = {
  basico: "Básico",
  pro: "Pro",
  basic: "Basic",
  standard: "Standard",
  corporate: "Corporate",
};

const ENV = getStripeEnvironment() as "sandbox" | "live";

function dateBR(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

/** Concessão de acesso gratuito para beta testers, sem passar pelo checkout. */
export function CourtesyPanel() {
  const [rows, setRows] = useState<CourtesyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [appKey, setAppKey] = useState(FLEXUS_APPS[0]!.key as string);
  const [tier, setTier] = useState<string>("pro");
  const [dias, setDias] = useState("30");
  const [nota, setNota] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listCourtesy();
    if ("error" in result) toast.error(result.error);
    else setRows(result.rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGrant = async () => {
    setSaving(true);
    const result = await grantCourtesy({
      data: { email, appKey, tier, dias: Number(dias), nota, environment: ENV },
    });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setEmail("");
    setNota("");
    void load();
  };

  const handleRevoke = async (id: string) => {
    const result = await revokeCourtesy({ data: { id } });
    if ("error" in result) toast.error(result.error);
    else {
      toast.success("Cortesia encerrada e acesso bloqueado.");
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Cortesias (beta testers)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Libera acesso gratuito por prazo determinado, sem cobrança e sem checkout. O
          cliente recebe os mesmos limites de usuários do plano escolhido, e o acesso é
          bloqueado automaticamente no vencimento.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" /> Conceder acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cortesia-email">E-mail do beta tester</Label>
            <Input
              id="cortesia-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@empresa.com.br"
            />
            <p className="text-xs text-muted-foreground">
              Se ainda não tiver conta, um convite de acesso é enviado por e-mail.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cortesia-app">Sistema</Label>
            <select
              id="cortesia-app"
              value={appKey}
              onChange={(e) => {
                const next = e.target.value;
                setAppKey(next);
                const opts = courtesyTiersForProduct(next);
                if (!opts.includes(tier)) setTier(opts[0]!);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {FLEXUS_APPS.map((app) => (
                <option key={app.key} value={app.key}>
                  {app.name}
                  {app.available ? "" : " (em breve)"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cortesia-plano">Plano liberado</Label>
            <select
              id="cortesia-plano"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {courtesyTiersForProduct(appKey).map((t) => (
                <option key={t} value={t}>
                  {TIER_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cortesia-dias">Validade (dias)</Label>
            <Input
              id="cortesia-dias"
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="cortesia-nota">Observação (opcional)</Label>
            <Input
              id="cortesia-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex.: piloto Casa360 — indicação do cliente X"
            />
          </div>

          <div className="md:col-span-2">
            <Button onClick={handleGrant} disabled={saving || !email}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conceder cortesia
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cortesias concedidas</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma cortesia concedida ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">E-mail</th>
                    <th className="py-2 pr-4">Sistema / plano</th>
                    <th className="py-2 pr-4">Válido até</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Observação</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const ativa =
                      row.status === "active" &&
                      (!row.current_period_end ||
                        new Date(row.current_period_end).getTime() > Date.now());
                    return (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2 pr-4">{row.email ?? row.user_id}</td>
                        <td className="py-2 pr-4">{row.price_id}</td>
                        <td className="py-2 pr-4">{dateBR(row.current_period_end)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={ativa ? "default" : "secondary"}>
                            {ativa ? "Ativa" : "Encerrada"}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {row.courtesy_note ?? "—"}
                        </td>
                        <td className="py-2">
                          {ativa && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => void handleRevoke(row.id)}
                            >
                              <XCircle className="mr-1 h-4 w-4" /> Encerrar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
