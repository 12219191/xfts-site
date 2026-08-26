import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Loader2, RefreshCw, TrendingDown, TrendingUp, Undo2 } from "lucide-react";
import {
  getInvoiceExport,
  getPaymentsAndRefunds,
  getPlanBreakdown,
  getRevenueOverview,
} from "@/lib/finance.functions";
import type { PaymentRow, RefundLogRow, RevenueOverview } from "@/lib/finance.server";
import { getStripeEnvironment } from "@/lib/stripe";

const env = (getStripeEnvironment() === "sandbox" ? "sandbox" : "live") as "sandbox" | "live";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const pct = (v: number) => `${v.toFixed(1)}%`;
const dateBR = (iso: string) => new Date(iso).toLocaleString("pt-BR");
const mesBR = (mes: string) => {
  const [y, m] = mes.split("-");
  return `${m}/${y}`;
};

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    toast.info("Nada para exportar neste período.");
    return;
  }
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold text-card-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Fase 5 — Receita e financeiro: MRR/churn, reembolsos e exportações contábeis. */
export function FinancePanel() {
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [refunds, setRefunds] = useState<RefundLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [alvo, setAlvo] = useState<PaymentRow | null>(null);
  const [motivo, setMotivo] = useState("");
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);
  const primeiroDia = `${hoje.slice(0, 7)}-01`;
  const [de, setDe] = useState(primeiroDia);
  const [ate, setAte] = useState(hoje);
  const [exportando, setExportando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, pay] = await Promise.all([
      getRevenueOverview({ data: { environment: env } }),
      getPaymentsAndRefunds({ data: { environment: env } }),
    ]);
    if ("error" in ov) toast.error(ov.error);
    else setOverview(ov);
    if ("error" in pay) toast.error(pay.error);
    else {
      setPayments(pay.payments);
      setRefunds(pay.refunds);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmarReembolso = async () => {
    if (!alvo) return;
    setEnviando(true);
    const parsed = valor.trim() ? Number(valor.replace(",", ".")) : null;
    const { refundPayment } = await import("@/lib/finance.functions");
    const result = await refundPayment({
      data: { environment: env, chargeId: alvo.id, amount: parsed, reason: motivo.trim() },
    });
    setEnviando(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Reembolso de ${brl(result.amount)} confirmado.`);
    setAlvo(null);
    setMotivo("");
    setValor("");
    void load();
  };

  const exportarFaturas = async () => {
    setExportando(true);
    const result = await getInvoiceExport({
      data: { environment: env, from: `${de}T00:00:00.000Z`, to: `${ate}T23:59:59.000Z` },
    });
    setExportando(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    downloadCsv(`faturas-${de}-a-${ate}.csv`, result.invoices as unknown as Record<string, unknown>[]);
  };

  const exportarPlanos = async () => {
    const result = await getPlanBreakdown({ data: { environment: env } });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    downloadCsv(`receita-por-plano-${hoje}.csv`, result.rows as unknown as Record<string, unknown>[]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Receita e financeiro</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Receita recorrente por produto, entradas e saídas de clientes por mês, reembolsos e
            exportações para a contabilidade.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="MRR" value={brl(overview?.mrr ?? 0)} hint={`${overview?.clientesAtivos ?? 0} assinaturas ativas`} />
        <Kpi label="ARR" value={brl(overview?.arr ?? 0)} hint="Projeção de 12 meses" />
        <Kpi label="Ticket médio" value={brl(overview?.arpu ?? 0)} hint="Receita por cliente ativo" />
        <Kpi
          label="Reembolsos (30 dias)"
          value={brl(overview?.reembolsos30d.valor ?? 0)}
          hint={`${overview?.reembolsos30d.quantidade ?? 0} operações`}
        />
      </div>

      <Tabs defaultValue="receita">
        <TabsList>
          <TabsTrigger value="receita">Receita</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
          <TabsTrigger value="exportacoes">Exportações</TabsTrigger>
        </TabsList>

        <TabsContent value="receita" className="mt-4 space-y-6">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Clientes</th>
                      <th className="p-3">Cortesias</th>
                      <th className="p-3">MRR</th>
                      <th className="p-3">ARR</th>
                      <th className="p-3">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.porProduto ?? []).map((p) => (
                      <tr key={p.key} className="border-b border-border/60">
                        <td className="p-3 font-medium text-card-foreground">{p.name}</td>
                        <td className="p-3">{p.clientes}</td>
                        <td className="p-3">{p.cortesias}</td>
                        <td className="p-3">{brl(p.mrr)}</td>
                        <td className="p-3">{brl(p.arr)}</td>
                        <td className="p-3">{brl(p.arpu)}</td>
                      </tr>
                    ))}
                    {!loading && (overview?.porProduto.length ?? 0) === 0 && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={6}>
                          Nenhuma assinatura ativa neste ambiente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Mês</th>
                      <th className="p-3">Novos</th>
                      <th className="p-3">Cancelados</th>
                      <th className="p-3">Ativos no fim</th>
                      <th className="p-3">MRR</th>
                      <th className="p-3">Churn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.meses ?? []).map((m) => (
                      <tr key={m.mes} className="border-b border-border/60">
                        <td className="p-3 font-medium text-card-foreground">{mesBR(m.mes)}</td>
                        <td className="p-3 text-emerald-600">
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {m.novos}
                          </span>
                        </td>
                        <td className="p-3 text-destructive">
                          <span className="inline-flex items-center gap-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {m.cancelados}
                          </span>
                        </td>
                        <td className="p-3">{m.ativosFim}</td>
                        <td className="p-3">{brl(m.mrrFim)}</td>
                        <td className="p-3">{pct(m.churnPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Entrou em</th>
                      <th className="p-3">Assinaturas</th>
                      <th className="p-3">Ainda ativas</th>
                      <th className="p-3">Retenção</th>
                      <th className="p-3">MRR atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.cohorts ?? []).map((c) => (
                      <tr key={c.mes} className="border-b border-border/60">
                        <td className="p-3 font-medium text-card-foreground">{mesBR(c.mes)}</td>
                        <td className="p-3">{c.clientes}</td>
                        <td className="p-3">{c.ativos}</td>
                        <td className="p-3">
                          <Badge variant={c.retencaoPct >= 70 ? "default" : "secondary"}>
                            {pct(c.retencaoPct)}
                          </Badge>
                        </td>
                        <td className="p-3">{brl(c.mrr)}</td>
                      </tr>
                    ))}
                    {!loading && (overview?.cohorts.length ?? 0) === 0 && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={5}>
                          Ainda não há histórico suficiente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reembolsos" className="mt-4 space-y-6">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Reembolsado</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="p-3">{dateBR(p.createdAt)}</td>
                        <td className="p-3">{p.email}</td>
                        <td className="p-3 text-muted-foreground">{p.descricao}</td>
                        <td className="p-3">{brl(p.amount)}</td>
                        <td className="p-3">{p.refunded > 0 ? brl(p.refunded) : "—"}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!p.refundable}
                            onClick={() => {
                              setAlvo(p);
                              setMotivo("");
                              setValor("");
                            }}
                          >
                            <Undo2 className="mr-2 h-4 w-4" />
                            Reembolsar
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!loading && payments.length === 0 && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={6}>
                          Nenhuma cobrança recente neste ambiente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Reembolsos executados</h4>
            <Card className="mt-3 border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Cobrança</th>
                        <th className="p-3">Valor</th>
                        <th className="p-3">Motivo</th>
                        <th className="p-3">Operador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.map((r) => (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="p-3">{dateBR(r.createdAt)}</td>
                          <td className="p-3 font-mono text-xs">{r.chargeId}</td>
                          <td className="p-3">{brl(r.amount)}</td>
                          <td className="p-3 text-muted-foreground">{r.reason}</td>
                          <td className="p-3">{r.operador}</td>
                        </tr>
                      ))}
                      {refunds.length === 0 && (
                        <tr>
                          <td className="p-4 text-muted-foreground" colSpan={5}>
                            Nenhum reembolso registrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="exportacoes" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="space-y-5 p-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Faturas do período</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Planilha com número da fatura, cliente, impostos, total, valor pago e link do PDF.
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">De</label>
                    <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="mt-1 w-44" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Até</label>
                    <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="mt-1 w-44" />
                  </div>
                  <Button onClick={() => void exportarFaturas()} disabled={exportando}>
                    {exportando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar CSV
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <h4 className="text-sm font-semibold text-foreground">Receita por produto e plano</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fotografia atual das assinaturas ativas, para conciliação com o extrato.
                </p>
                <Button variant="outline" className="mt-3" onClick={() => void exportarPlanos()}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={alvo !== null} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reembolsar cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {alvo ? `${alvo.email} — ${brl(alvo.amount)} em ${dateBR(alvo.createdAt)}` : ""}
            </p>
            <div>
              <label className="text-xs text-muted-foreground">
                Valor a reembolsar (deixe vazio para reembolso total)
              </label>
              <Input
                className="mt-1"
                placeholder={alvo ? String(alvo.amount - alvo.refunded) : ""}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Motivo (registrado na auditoria)</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: cobrança duplicada confirmada pelo cliente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmarReembolso()}
              disabled={enviando || motivo.trim().length < 5}
            >
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
