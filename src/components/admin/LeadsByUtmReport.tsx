import { useMemo, useState } from "react";
import type { FormSubmissionRow } from "@/lib/form-submissions.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Model = "first" | "last";

function value(r: FormSubmissionRow, key: "source" | "campaign", model: Model) {
  const v =
    model === "last"
      ? key === "source"
        ? r.lt_utm_source
        : r.lt_utm_campaign
      : key === "source"
        ? r.utm_source
        : r.utm_campaign;
  const clean = (v ?? "").trim();
  if (clean) return clean;
  const ref = (model === "last" ? r.lt_referrer : r.referrer)?.trim();
  return key === "source" ? (ref ? `ref: ${ref}` : "direto") : "(sem campanha)";
}

type Group = { key: string; total: number; sent: number };

function aggregate(rows: FormSubmissionRow[], key: "source" | "campaign", model: Model): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const k = value(r, key, model);
    const g = map.get(k) ?? { key: k, total: 0, sent: 0 };
    g.total += 1;
    if (r.status === "sent") g.sent += 1;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function GroupTable({
  title,
  groups,
  totalRows,
}: {
  title: string;
  groups: Group[];
  totalRows: number;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <Badge variant="secondary">{groups.length} valores</Badge>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2 text-right">Leads</th>
                <th className="px-4 py-2 text-right">Entregues</th>
                <th className="px-4 py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Sem dados para o filtro atual.
                  </td>
                </tr>
              )}
              {groups.map((g) => {
                const share = totalRows ? Math.round((g.total / totalRows) * 100) : 0;
                return (
                  <tr key={g.key} className="border-t border-border/60">
                    <td className="px-4 py-2 text-foreground">{g.key}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{g.total}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{g.sent}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        {share}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadsByUtmReport({
  rows,
  model,
}: {
  rows: FormSubmissionRow[];
  model: Model;
}) {
  const [open, setOpen] = useState(true);

  const bySource = useMemo(() => aggregate(rows, "source", model), [rows, model]);
  const byCampaign = useMemo(() => aggregate(rows, "campaign", model), [rows, model]);
  const pairs = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of rows) {
      const k = `${value(r, "source", model)} · ${value(r, "campaign", model)}`;
      const g = map.get(k) ?? { key: k, total: 0, sent: 0 };
      g.total += 1;
      if (r.status === "sent") g.sent += 1;
      map.set(k, g);
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  }, [rows, model]);

  const exportCsv = () => {
    const lines = [
      "dimensao,valor,leads,entregues",
      ...bySource.map((g) => `utm_source,"${g.key}",${g.total},${g.sent}`),
      ...byCampaign.map((g) => `utm_campaign,"${g.key}",${g.total},${g.sent}`),
      ...pairs.map((g) => `source_x_campaign,"${g.key}",${g.total},${g.sent}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-por-utm-${model}-touch.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Relatório de leads por origem
          </h3>
          <p className="text-sm text-muted-foreground">
            Contagem de leads por utm_source e utm_campaign ({model === "first" ? "first" : "last"}-touch),
            usando os filtros aplicados abaixo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? "Ocultar relatório" : "Mostrar relatório"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-4 lg:grid-cols-2">
          <GroupTable title="Leads por utm_source" groups={bySource} totalRows={rows.length} />
          <GroupTable title="Leads por utm_campaign" groups={byCampaign} totalRows={rows.length} />
          <div className="lg:col-span-2">
            <GroupTable title="Origem × Campanha" groups={pairs} totalRows={rows.length} />
          </div>
        </div>
      )}
    </div>
  );
}
