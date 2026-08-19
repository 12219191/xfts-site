import { useMemo } from "react";
import type { FormSubmissionRow } from "@/lib/form-submissions.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { pageNameBySlug } from "@/lib/page-registry";
import { PLACEMENT_LABEL, type CtaPlacement } from "@/lib/tracking";

type Group = { key: string; label: string; detail: string; total: number; sent: number };

function aggregate(
  rows: FormSubmissionRow[],
  mode: "page" | "cta" | "form-page" | "placement"
): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    let key: string;
    let label: string;
    let detail: string;

    if (mode === "page") {
      key = r.cta_page ?? "(sem clique rastreado)";
      label = r.cta_page ? pageNameBySlug(r.cta_page) : "Sem clique rastreado";
      detail = r.cta_page ?? "—";
    } else if (mode === "placement") {
      key = r.cta_placement ?? "(sem clique rastreado)";
      label = r.cta_placement
        ? PLACEMENT_LABEL[r.cta_placement as CtaPlacement] ?? r.cta_placement
        : "Sem clique rastreado";
      detail = r.cta_placement ?? "—";
    } else if (mode === "cta") {
      key = r.cta_id ?? "(sem clique rastreado)";
      label = r.cta_label ?? "Sem clique rastreado";
      detail = r.cta_id ?? "—";
    } else {
      key = r.tela || "(sem página)";
      label = pageNameBySlug(r.tela);
      detail = r.tela || "—";
    }

    const g = map.get(key) ?? { key, label, detail, total: 0, sent: 0 };
    g.total += 1;
    if (r.status === "sent") g.sent += 1;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function GroupTable({
  title,
  subtitle,
  groups,
  totalRows,
}: {
  title: string;
  subtitle: string;
  groups: Group[];
  totalRows: number;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Badge variant="secondary">{groups.length} valores</Badge>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Origem</th>
                <th className="px-4 py-2 text-right">Leads</th>
                <th className="px-4 py-2 text-right">Entregues</th>
                <th className="px-4 py-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Sem dados no filtro atual.
                  </td>
                </tr>
              )}
              {groups.map((g) => (
                <tr key={g.key} className="border-t border-border/60">
                  <td className="px-4 py-2">
                    <span className="block font-medium text-foreground">{g.label}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{g.detail}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-foreground">{g.total}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{g.sent}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {totalRows ? `${Math.round((g.total / totalRows) * 100)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadsByPageCtaReport({ rows }: { rows: FormSubmissionRow[] }) {
  const byClickPage = useMemo(() => aggregate(rows, "page"), [rows]);
  const byCta = useMemo(() => aggregate(rows, "cta"), [rows]);
  const byFormPage = useMemo(() => aggregate(rows, "form-page"), [rows]);
  const byPlacement = useMemo(() => aggregate(rows, "placement"), [rows]);

  const exportCsv = () => {
    const lines = [["dimensao", "nome", "identificador", "leads", "entregues"].join(";")];
    const push = (dim: string, groups: Group[]) => {
      for (const g of groups) {
        lines.push([dim, g.label, g.detail, g.total, g.sent].join(";"));
      }
    };
    push("pagina_do_clique", byClickPage);
    push("tipo_de_clique", byPlacement);
    push("botao", byCta);
    push("pagina_do_formulario", byFormPage);

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-por-pagina-botao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Leads por página e por botão</h4>
          <p className="text-xs text-muted-foreground">
            Mostra de qual página e de qual botão veio o clique que levou ao formulário.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <GroupTable
          title="Tipo de clique"
          subtitle="Topo, rodapé, card, hero, preços..."
          groups={byPlacement}
          totalRows={rows.length}
        />
        <GroupTable
          title="Página do clique"
          subtitle="Onde o visitante clicou no CTA"
          groups={byClickPage}
          totalRows={rows.length}
        />
        <GroupTable
          title="Botão clicado"
          subtitle="Botão que originou o lead"
          groups={byCta}
          totalRows={rows.length}
        />
        <GroupTable
          title="Página do formulário"
          subtitle="Onde o formulário foi enviado"
          groups={byFormPage}
          totalRows={rows.length}
        />
      </div>
    </div>
  );
}
