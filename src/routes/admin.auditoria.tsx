import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/admin/admin-context";
import { listAdminAudit, type AuditRow } from "@/lib/admin-audit.functions";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/auditoria")({
  component: () => (
    <ModuleGuard module="auditoria">
      <AuditoriaPage />
    </ModuleGuard>
  ),
});

const DAYS = [7, 30, 90];

function AuditoriaPage() {
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listAdminAudit({ data: { action, actor, days } });
      if ("error" in result) toast.error(result.error);
      else setEntries(result.entries);
    } catch {
      toast.error("Falha ao carregar a auditoria.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Quem fez o quê, quando e por quê — todas as ações administrativas ficam registradas.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="e-mail do responsável"
          className="max-w-xs"
        />
        <Input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="ação (ex.: entitlement.seats_override)"
          className="max-w-xs"
        />
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
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Filtrar
        </Button>
      </form>

      {entries.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">Nenhum registro no período.</p>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.id} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.action}</Badge>
                  <span className="text-sm text-foreground">{e.actor_email ?? "—"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.target_type}: {e.target_id ?? "—"}
                {e.reason ? ` · motivo: ${e.reason}` : ""}
              </p>
              {(e.before || e.after) && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
{`antes: ${e.before ?? "—"}
depois: ${e.after ?? "—"}`}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
