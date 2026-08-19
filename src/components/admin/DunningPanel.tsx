import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Mail, PlayCircle, RefreshCw, ShieldOff } from "lucide-react";
import {
  getDunningOverview,
  runDunningNow,
  type DunningEmailRow,
  type DunningRow,
} from "@/lib/dunning.functions";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const fmtBRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function statusBadge(row: DunningRow) {
  if (row.resolved_at) return <Badge variant="secondary">Regularizado</Badge>;
  if (row.blocked_at) return <Badge variant="destructive">Acesso bloqueado</Badge>;
  return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Em cobrança</Badge>;
}

export function DunningPanel() {
  const [states, setStates] = useState<DunningRow[]>([]);
  const [emails, setEmails] = useState<DunningEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getDunningOverview();
      setStates(data.states);
      setEmails(data.emails);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar cobranças");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runDunningNow();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          `Régua executada: ${result.checked} em aberto, ${result.emails} e-mail(s), ${result.blocked} bloqueio(s).`,
        );
        await load();
      }
    } finally {
      setRunning(false);
    }
  };

  const abertas = states.filter((s) => !s.resolved_at && !s.blocked_at);
  const bloqueadas = states.filter((s) => s.blocked_at && !s.resolved_at);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-foreground">{abertas.length}</p>
              <p className="text-xs text-muted-foreground">Cobranças em aberto</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{emails.length}</p>
              <p className="text-xs text-muted-foreground">E-mails de cobrança enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <ShieldOff className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-foreground">{bloqueadas.length}</p>
              <p className="text-xs text-muted-foreground">Acessos bloqueados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleRun} disabled={running}>
          <PlayCircle className="mr-2 h-4 w-4" />
          {running ? "Executando..." : "Executar régua agora"}
        </Button>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
        <p className="text-xs text-muted-foreground">
          Régua: e-mail em D+1 (na falha), D+3 e D+5. Bloqueio automático após 5 dias de carência.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assinaturas com pagamento pendente</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Titular</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Falhou em</th>
                <th className="px-4 py-3">Carência até</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {states.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {loading ? "Carregando..." : "Nenhuma cobrança registrada."}
                  </td>
                </tr>
              )}
              {states.map((row) => (
                <tr key={row.stripe_subscription_id} className="border-t border-border">
                  <td className="px-4 py-3">{row.email ?? "—"}</td>
                  <td className="px-4 py-3">{row.price_id ?? "—"}</td>
                  <td className="px-4 py-3">{fmtBRL(row.amount_due)}</td>
                  <td className="px-4 py-3">{fmtDate(row.failed_at)}</td>
                  <td className="px-4 py-3">{fmtDate(row.grace_until)}</td>
                  <td className="px-4 py-3">D+{row.last_stage || 0}</td>
                  <td className="px-4 py-3">{statusBadge(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de e-mails</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Enviado em</th>
                <th className="px-4 py-3">Destinatário</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {emails.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum e-mail enviado ainda.
                  </td>
                </tr>
              )}
              {emails.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3">{row.email ?? "—"}</td>
                  <td className="px-4 py-3">D+{row.stage}</td>
                  <td className="px-4 py-3">
                    {row.status === "sent" ? (
                      <Badge variant="secondary">Enviado</Badge>
                    ) : (
                      <span className="text-destructive">{row.status}{row.error ? ` — ${row.error}` : ""}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
