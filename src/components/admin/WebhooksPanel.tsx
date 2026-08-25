import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MinusCircle,
  RefreshCw,
  Webhook,
} from "lucide-react";
import {
  listWebhookEvents,
  type WebhookEventRow,
  type WebhookEventsResult,
} from "@/lib/webhook-events.functions";

type StatusFilter = "todos" | "processed" | "ignored" | "failed";
type EnvFilter = "todos" | "sandbox" | "live";

const STATUS_LABEL: Record<string, string> = {
  processed: "Processado",
  ignored: "Ignorado",
  failed: "Falha",
};

function dateTimeBR(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "failed") {
    return (
      <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
        <AlertTriangle className="h-3 w-3" /> Falha
      </Badge>
    );
  }
  if (status === "ignored") {
    return (
      <Badge variant="secondary" className="gap-1">
        <MinusCircle className="h-3 w-3" /> Ignorado
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
      <CheckCircle2 className="h-3 w-3" /> Processado
    </Badge>
  );
}

/** Monitoramento dos webhooks do Stripe: saúde recente e log de eventos. */
export function WebhooksPanel() {
  const [data, setData] = useState<WebhookEventsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [env, setEnv] = useState<EnvFilter>("todos");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listWebhookEvents({
      data: { status, environment: env, eventType: search.trim() || undefined },
    });
    if ("error" in result) toast.error(result.error);
    else setData(result);
    setLoading(false);
  }, [status, env, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Atualiza sozinho a cada 60s para detectar falhas rapidamente.
  useEffect(() => {
    const timer = setInterval(() => void load(), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const stats = data?.stats;
  const rows: WebhookEventRow[] = data?.rows ?? [];
  const healthy = (stats?.failed24h ?? 0) === 0 && (stats?.total24h ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Webhooks Stripe</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe em tempo real os eventos recebidos do Stripe (compras, renovações,
            cancelamentos e falhas de pagamento) e identifique rapidamente problemas de
            integração.
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

      {/* Saúde */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4 text-primary" />
            Situação nas últimas 24h
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Eventos</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats?.total24h ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Falhas</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                (stats?.failed24h ?? 0) > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {stats?.failed24h ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Tempo médio
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {stats?.avgDuration ?? 0}
              <span className="ml-1 text-sm font-normal text-muted-foreground">ms</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Último evento
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {dateTimeBR(stats?.lastEventAt ?? null)}
            </p>
          </div>
        </CardContent>
      </Card>

      {(stats?.failed24h ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {stats?.failed24h} evento(s) com falha nas últimas 24h
            </p>
            <p className="mt-1 text-muted-foreground">
              Última falha em {dateTimeBR(stats?.lastFailureAt ?? null)}. Verifique abaixo o
              motivo — falhas de assinatura indicam segredo do webhook desatualizado.
            </p>
          </div>
        </div>
      )}

      {healthy && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Integração saudável: todos os eventos das últimas 24h foram recebidos sem erro.
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(["todos", "failed", "processed", "ignored"] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s === "todos" ? "Todos" : STATUS_LABEL[s]}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {(["todos", "live", "sandbox"] as EnvFilter[]).map((e) => (
          <Button
            key={e}
            size="sm"
            variant={env === e ? "default" : "outline"}
            onClick={() => setEnv(e)}
          >
            {e === "todos" ? "Todos ambientes" : e === "live" ? "Produção" : "Teste"}
          </Button>
        ))}
        <Input
          placeholder="Filtrar por tipo de evento..."
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          className="h-9 w-full sm:w-64"
        />
      </div>

      {/* Log */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando eventos...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum evento registrado com esses filtros. Novos eventos aparecem assim que o
              Stripe enviar uma notificação.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="p-4">
                  <button
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-foreground">
                        {row.event_type}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dateTimeBR(row.created_at)} · {row.environment === "live" ? "Produção" : "Teste"} ·{" "}
                        {row.duration_ms}ms
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </button>

                  {row.error && (
                    <p className="mt-2 rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                      {row.error}
                    </p>
                  )}

                  {expanded === row.id && (
                    <pre className="mt-3 overflow-x-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                      {JSON.stringify(
                        { stripe_event_id: row.stripe_event_id, ...(row.summary ?? {}) },
                        null,
                        2,
                      )}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
