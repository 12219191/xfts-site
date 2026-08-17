import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getAdminSubscriptions,
  type AdminSubscriptionRow,
} from "@/lib/admin-subscriptions.functions";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

type Bucket = "all" | "active" | "canceled" | "failed";

const FAILED = ["past_due", "unpaid", "incomplete", "incomplete_expired"];

function bucketOf(sub: AdminSubscriptionRow): Exclude<Bucket, "all"> {
  if (FAILED.includes(sub.status)) return "failed";
  if (sub.status === "canceled") return "canceled";
  return "active";
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento atrasado",
  unpaid: "Não paga",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  canceled: "Cancelada",
  paused: "Pausada",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Assinatura criada",
  subscription_created: "Assinatura criada",
  updated: "Assinatura atualizada",
  subscription_updated: "Assinatura atualizada",
  upgraded: "Upgrade de plano",
  downgraded: "Downgrade agendado",
  canceled: "Cancelamento",
  subscription_canceled: "Cancelamento",
  reactivated: "Reativação",
  payment_failed: "Falha de pagamento",
  payment_succeeded: "Pagamento confirmado",
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ sub }: { sub: AdminSubscriptionRow }) {
  const bucket = bucketOf(sub);
  const styles =
    bucket === "active"
      ? "bg-cta/10 text-cta"
      : bucket === "failed"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  const Icon = bucket === "active" ? CheckCircle2 : bucket === "failed" ? AlertTriangle : XCircle;
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
        <Icon className="h-3 w-3" />
        {STATUS_LABEL[sub.status] ?? sub.status}
      </span>
      {sub.cancel_at_period_end && sub.status !== "canceled" && (
        <span className="text-[11px] text-amber-600">
          Cancela em {fmtDate(sub.current_period_end)}
        </span>
      )}
    </div>
  );
}

export function AdminSubscriptionsPanel() {
  const fetchSubs = useServerFn(getAdminSubscriptions);
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSubs({ data: undefined });
      if ("error" in result) setError(result.error);
      else setRows(result.subscriptions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar assinaturas");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => bucketOf(r) === "active").length,
      canceled: rows.filter((r) => bucketOf(r) === "canceled").length,
      failed: rows.filter((r) => bucketOf(r) === "failed").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (bucket !== "all" && bucketOf(r) !== bucket) return false;
      if (!q) return true;
      return [r.email, r.product_id, r.price_id, r.stripe_customer_id, r.stripe_subscription_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, bucket, query]);

  const tabs: { id: Bucket; label: string; color: string }[] = [
    { id: "all", label: "Todas", color: "text-foreground" },
    { id: "active", label: "Ativas", color: "text-cta" },
    { id: "canceled", label: "Canceladas", color: "text-muted-foreground" },
    { id: "failed", label: "Com falha", color: "text-destructive" },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard icon={CreditCard} label="Total" value={counts.all} />
        <MetricCard icon={CheckCircle2} label="Ativas" value={counts.active} color="text-cta" />
        <MetricCard icon={XCircle} label="Canceladas" value={counts.canceled} color="text-muted-foreground" />
        <MetricCard icon={AlertTriangle} label="Com falha" value={counts.failed} color="text-destructive" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setBucket(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                bucket === t.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} <span className="text-xs opacity-70">({counts[t.id]})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente ou plano"
              className="w-56 pl-8"
            />
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-5 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="hidden px-5 py-3 font-medium text-muted-foreground md:table-cell">Plano</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="hidden px-5 py-3 font-medium text-muted-foreground lg:table-cell">Período atual</th>
              <th className="hidden px-5 py-3 font-medium text-muted-foreground sm:table-cell">Ambiente</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Ações do plano</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <>
                <tr key={sub.id} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{sub.email ?? "Cliente sem e-mail"}</p>
                    <p className="text-xs text-muted-foreground">{sub.stripe_customer_id}</p>
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell">
                    <p className="text-foreground">{sub.price_id}</p>
                    <p className="text-xs text-muted-foreground">{sub.product_id}</p>
                  </td>
                  <td className="px-5 py-3"><StatusBadge sub={sub} /></td>
                  <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                    {fmtDate(sub.current_period_start)} → {fmtDate(sub.current_period_end)}
                  </td>
                  <td className="hidden px-5 py-3 sm:table-cell">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {sub.environment === "live" ? "Produção" : "Teste"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                    >
                      {sub.events.length} evento{sub.events.length === 1 ? "" : "s"}
                      <ChevronDown
                        className={`ml-1 h-4 w-4 transition-transform ${expanded === sub.id ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </td>
                </tr>
                {expanded === sub.id && (
                  <tr key={`${sub.id}-events`} className="border-b border-border/50 bg-muted/10">
                    <td colSpan={6} className="px-5 py-4">
                      {sub.events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma ação de plano registrada para esta assinatura.
                        </p>
                      ) : (
                        <ol className="space-y-2">
                          {sub.events.map((ev) => (
                            <li key={ev.id} className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-xs text-muted-foreground">
                                {new Date(ev.created_at).toLocaleString("pt-BR")}
                              </span>
                              <span className="font-medium text-foreground">
                                {EVENT_LABEL[ev.event_type] ?? ev.event_type}
                              </span>
                              {ev.price_id && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                  {ev.price_id}
                                </span>
                              )}
                              {ev.reason && (
                                <span className="text-xs text-muted-foreground italic">“{ev.reason}”</span>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  Nenhuma assinatura encontrada.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  Carregando assinaturas...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: typeof CreditCard;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
