import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/admin/admin-context";
import {
  listAdminAudit,
  listSupportSessions,
  type AuditRow,
  type SupportSessionRow,
} from "@/lib/admin-audit.functions";
import { auditActionLabel, diffAuditFields } from "@/lib/audit-format";
import { getFlexusApp } from "@/lib/flexus-apps";
import { ArrowRight, LifeBuoy, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/auditoria")({
  component: () => (
    <ModuleGuard module="auditoria">
      <AuditoriaPage />
    </ModuleGuard>
  ),
});

const DAYS = [7, 30, 90];
const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

function AuditoriaPage() {
  const [tab, setTab] = useState<"acoes" | "suporte">("acoes");
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [sessions, setSessions] = useState<SupportSessionRow[]>([]);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "acoes") {
        const result = await listAdminAudit({ data: { action, actor, days } });
        if ("error" in result) toast.error(result.error);
        else setEntries(result.entries);
      } else {
        const result = await listSupportSessions({ data: { days } });
        if ("error" in result) toast.error(result.error);
        else setSessions(result.sessions);
      }
    } catch {
      toast.error("Falha ao carregar a auditoria.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, tab]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Quem fez o quê, quando e por quê — todas as ações administrativas ficam registradas.
        </p>
      </div>

      <div className="flex w-fit rounded-lg border border-border p-0.5">
        {([
          ["acoes", "Ações administrativas"],
          ["suporte", "Sessões de suporte"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1 text-xs ${
              tab === key ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        {tab === "acoes" && (
          <>
            <Input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="e-mail do responsável"
              className="max-w-xs"
            />
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="ação (ex.: seats_override)"
              className="max-w-xs"
            />
          </>
        )}
        <div className="flex rounded-lg border border-border p-0.5">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1 text-xs ${
                days === d ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <Button type="submit" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </form>

      {tab === "acoes" ? (
        <>
          {entries.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Nenhum registro no período.</p>
          )}
          <div className="space-y-2">
            {entries.map((e) => (
              <AuditCard key={e.id} entry={e} />
            ))}
          </div>
        </>
      ) : (
        <>
          {sessions.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              Nenhum acesso de suporte emitido no período.
            </p>
          )}
          <div className="space-y-2">
            {sessions.map((s) => {
              const used = Boolean(s.used_at);
              const expired = !used && new Date(s.expires_at).getTime() < Date.now();
              return (
                <Card key={s.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {getFlexusApp(s.app_key)?.name ?? s.app_key}
                        </span>
                        <Badge variant={used ? "default" : expired ? "secondary" : "outline"}>
                          {used ? "utilizado" : expired ? "expirado" : "aguardando uso"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmt(s.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cliente: {s.customer_email ?? "—"} · Responsável: {s.admin_email ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Motivo: {s.reason ?? "—"} · expira em {fmt(s.expires_at)}
                      {used ? ` · usado em ${fmt(s.used_at)}` : ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AuditCard({ entry }: { entry: AuditRow }) {
  const changes = diffAuditFields(entry.before, entry.after);
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{auditActionLabel(entry.action)}</Badge>
            <span className="text-sm text-foreground">{entry.actor_email ?? "—"}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(entry.created_at).toLocaleString("pt-BR")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {entry.target_type}: {entry.target_id ?? "—"}
          {entry.reason ? ` · motivo: ${entry.reason}` : ""}
        </p>
        {changes.length > 0 && (
          <div className="mt-2 space-y-1">
            {changes.map((c) => (
              <div key={c.field} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">{c.label}:</span>
                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground line-through">
                  {c.before ?? "—"}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  {c.after ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
