import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleGuard } from "@/components/admin/admin-context";
import { getAdminDashboard } from "@/lib/admin-dashboard.functions";
import type { DashboardAlertRow, DashboardData } from "@/lib/admin-dashboard.server";
import { AlertTriangle, Gift, RefreshCw, TrendingUp, Users, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  component: () => (
    <ModuleGuard module="dashboard">
      <DashboardPage />
    </ModuleGuard>
  ),
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("pt-BR") : "—";

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");

  const load = async (env: "live" | "sandbox") => {
    setLoading(true);
    setError("");
    try {
      const result = await getAdminDashboard({ data: { environment: env } });
      if ("error" in result) setError(result.error);
      else setData(result.data);
    } catch {
      setError("Não foi possível carregar os indicadores.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load(environment);
  }, [environment]);

  const kpis = data
    ? [
        { label: "MRR", value: brl(data.mrr), icon: TrendingUp },
        { label: "Clientes ativos", value: String(data.clientesAtivos), icon: Users },
        { label: "Cortesias", value: String(data.cortesias), icon: Gift },
        { label: "Cancelamentos no mês", value: String(data.cancelamentosMes), icon: XCircle },
        { label: "Inadimplentes", value: String(data.inadimplentes), icon: AlertTriangle },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Visão executiva</h1>
          <p className="text-sm text-muted-foreground">
            Receita, base de clientes e pontos de atenção do FLEXUS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {(["live", "sandbox"] as const).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`rounded-md px-3 py-1 text-xs ${
                  environment === env ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
                }`}
              >
                {env === "live" ? "Produção" : "Testes"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => load(environment)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !data && <p className="text-sm text-muted-foreground">Carregando indicadores...</p>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <kpi.icon className="h-4 w-4" />
                    <span className="text-xs">{kpi.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground">Por produto</h2>
              <div className="mt-3 grid gap-2">
                {data.porProduto.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa neste ambiente.</p>
                )}
                {data.porProduto.map((p) => (
                  <div key={p.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-foreground">{p.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {p.clientes} cliente{p.clientes === 1 ? "" : "s"} · {brl(p.mrr)}/mês
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {(data.operacional.webhooksFalhos24h > 0 ||
            data.operacional.provisionamentosEsgotados > 0 ||
            data.operacional.sistemasComProblema.length > 0) && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-destructive">
                  Atenção — integrações
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {data.operacional.webhooksFalhos24h > 0 && (
                    <li>
                      {data.operacional.webhooksFalhos24h} webhook(s) de pagamento com falha nas
                      últimas 24h ·{" "}
                      <Link to="/admin/integracoes" className="text-primary underline">
                        abrir Webhooks
                      </Link>
                    </li>
                  )}
                  {data.operacional.provisionamentosEsgotados > 0 && (
                    <li>
                      {data.operacional.provisionamentosEsgotados} aviso(s) de provisionamento com
                      tentativas esgotadas ·{" "}
                      <Link to="/admin/integracoes" className="text-primary underline">
                        abrir Provisionamento
                      </Link>
                    </li>
                  )}
                  {data.operacional.sistemasComProblema.length > 0 && (
                    <li>
                      Sistema(s) com problema: {data.operacional.sistemasComProblema.join(", ")} ·{" "}
                      <Link to="/admin/integracoes" className="text-primary underline">
                        abrir Saúde do SSO
                      </Link>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">

            <AlertList
              title="Assinaturas com problema"
              rows={data.assinaturasComProblema}
              to="/admin/assinaturas"
              cta="Ver assinaturas"
            />
            <AlertList
              title="Cortesias terminando"
              rows={data.cortesiasTerminando}
              to="/admin/cortesias"
              cta="Ver cortesias"
            />
            <AlertList
              title="Pagamentos falhos"
              rows={data.pagamentosFalhos}
              to="/admin/cobranca"
              cta="Ver cobrança"
            />
          </div>
        </>
      )}
    </div>
  );
}

function AlertList({
  title,
  rows,
  to,
  cta,
}: {
  title: string;
  rows: DashboardAlertRow[];
  to: string;
  cta: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex h-full flex-col p-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="mt-3 flex-1 space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nada por aqui. 🎉</p>}
          {rows.slice(0, 6).map((r) => (
            <div key={`${r.id}-${r.email}`} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-foreground">{r.email}</span>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.produto} · {r.plano} · até {fmtDate(r.detalhe)}
              </p>
            </div>
          ))}
        </div>
        <Link to={to} className="mt-4 text-xs font-medium text-primary hover:underline">
          {cta} →
        </Link>
      </CardContent>
    </Card>
  );
}
