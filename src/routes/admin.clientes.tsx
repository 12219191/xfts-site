import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/admin/admin-context";
import {
  createSupportAccessLink,
  listAdminCustomers,
  updateCustomerSeats,
} from "@/lib/admin-customers.functions";
import type { CustomerProduct, CustomerRow } from "@/lib/admin-customers.server";
import { History, LifeBuoy, Search, Users } from "lucide-react";
import { CustomerTimelineDialog } from "@/components/admin/CustomerTimelineDialog";
import { listAdminAudit, type AuditRow } from "@/lib/admin-audit.functions";
import { auditActionLabel, diffAuditFields } from "@/lib/audit-format";
import { SupportSessionsPanel } from "@/components/admin/SupportSessionsPanel";

export const Route = createFileRoute("/admin/clientes")({
  component: () => (
    <ModuleGuard module="clientes">
      <ClientesPage />
    </ModuleGuard>
  ),
});

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [timelineFor, setTimelineFor] = useState<CustomerRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listAdminCustomers({ data: { search, environment } });
      if ("error" in result) {
        toast.error(result.error);
        setRows([]);
      } else {
        setRows(result.customers);
      }
    } catch {
      toast.error("Falha ao buscar clientes.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Busque por e-mail e veja todos os produtos, limites e acessos de cada cliente.
        </p>
      </div>

      <SupportSessionsPanel />


      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="E-mail do cliente (ou vazio para os mais recentes)"
          className="max-w-sm"
        />
        <div className="flex rounded-lg border border-border p-0.5">
          {(["live", "sandbox"] as const).map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => setEnvironment(env)}
              className={`rounded-md px-3 py-1 text-xs ${
                environment === env ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
              }`}
            >
              {env === "live" ? "Produção" : "Testes"}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={loading}>
          <Search className="mr-2 h-4 w-4" /> Buscar
        </Button>
      </form>

      {rows === null && (
        <p className="text-sm text-muted-foreground">Faça uma busca para listar clientes.</p>
      )}
      {rows?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
      )}

      <div className="space-y-4">
        {(rows ?? []).map((row) => (
          <Card key={row.userId} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{row.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    cliente desde {fmtDate(row.createdAt)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setTimelineFor(row)}>
                    <History className="mr-2 h-4 w-4" /> Histórico
                  </Button>
                </div>
              </div>


              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {row.produtos.map((p) => (
                  <ProductCard key={p.subscriptionId} userId={row.userId} product={p} onDone={load} />
                ))}
                {row.produtos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem assinaturas neste ambiente.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {timelineFor && (
        <CustomerTimelineDialog
          open={!!timelineFor}
          onOpenChange={(open) => !open && setTimelineFor(null)}
          userId={timelineFor.userId}
          email={timelineFor.email}
          environment={environment}
        />
      )}
    </div>
  );
}

function ProductCard({
  userId,
  product,
  onDone,
}: {
  userId: string;
  product: CustomerProduct;
  onDone: () => void;
}) {
  const [seats, setSeats] = useState(
    product.seatsOverride !== null ? String(product.seatsOverride) : "",
  );
  const [seatsReason, setSeatsReason] = useState("");
  const [supportReason, setSupportReason] = useState("");
  const [supportRole, setSupportRole] = useState<"XFTS_SUPPORT" | "XFTS_SUPERADMIN">("XFTS_SUPPORT");
  const [supportTicket, setSupportTicket] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<AuditRow[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const loadHistory = async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (!next || history) return;
    try {
      const [bySub, byUser] = await Promise.all([
        listAdminAudit({ data: { targetId: product.subscriptionId, days: 365 } }),
        listAdminAudit({ data: { targetId: userId, days: 365 } }),
      ]);
      const entries = [
        ...("entries" in bySub ? bySub.entries : []),
        ...("entries" in byUser ? byUser.entries : []),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setHistory(entries);
    } catch {
      setHistory([]);
    }
  };

  const saveSeats = async () => {
    setBusy(true);
    try {
      const result = await updateCustomerSeats({
        data: {
          subscriptionId: product.subscriptionId,
          seats: seats.trim() === "" ? null : Number(seats),
          reason: seatsReason,
        },
      });
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Limite de usuários atualizado.");
        setSeatsReason("");
        setHistory(null);
        onDone();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
    setBusy(false);
  };

  const supportAccess = async () => {
    if (supportReason.trim().length < 5) {
      toast.error("Informe o motivo do acesso de suporte.");
      return;
    }
    setBusy(true);
    try {
      const result = await createSupportAccessLink({
        data: { userId, app: product.app, reason: supportReason, role: supportRole, ticket: supportTicket || null },
      });
      if ("error" in result) toast.error(result.error);
      else {
        if (result.flow === "session") {
          window.open(result.url, "_blank", "noopener,noreferrer");
          toast.success("Sessão de Suporte XFTS aberta em nova aba (link de uso único, 5 min).");
        } else {
          await navigator.clipboard.writeText(result.url).catch(() => undefined);
          toast.success("Link de suporte (fluxo antigo) gerado e copiado.");
        }
        setSupportReason("");
        setSupportTicket("");
        setHistory(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar acesso.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{product.appName}</span>
        <div className="flex gap-1">
          {product.isCourtesy && <Badge variant="secondary">Cortesia</Badge>}
          <Badge variant={product.ativo ? "default" : "secondary"}>{product.status}</Badge>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {product.plano} · {product.ciclo} · renova em {fmtDate(product.currentPeriodEnd)}
        {product.cancelAtPeriodEnd ? " · cancelamento agendado" : ""}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Usuários em uso / limite: {product.seatsUsed ?? 0} / {product.seatsLimit ?? "—"}{product.seatsReportedAt ? ` (relatado em ${new Date(product.seatsReportedAt).toLocaleString("pt-BR")})` : " (sem relato)"}
        {product.seatsOverride !== null ? " (limite manual)" : ""}
      </p>

      <div className="mt-3 rounded-md border border-border/70 bg-muted/20 p-3">
        <p className="text-xs font-medium text-foreground">Limite de usuários</p>
        <div className="mt-2 grid gap-2">
          <div className="flex gap-2">
            <Input
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder="Limite manual (vazio = plano)"
              inputMode="numeric"
              className="h-9"
            />
            <Button size="sm" variant="outline" onClick={saveSeats} disabled={busy}>
              Salvar
            </Button>
          </div>
          <Input
            value={seatsReason}
            onChange={(e) => setSeatsReason(e.target.value)}
            placeholder="Motivo da alteração (obrigatório, fica na auditoria)"
            className="h-9"
          />
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border/70 bg-muted/20 p-3">
        <p className="text-xs font-medium text-foreground">Acesso de suporte</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Você entra com a sua identidade XFTS, nunca como o admin do cliente. Sistemas que ainda
          não usam a Sessão de Suporte XFTS seguem no fluxo antigo.
        </p>
        <div className="mt-2 grid gap-2">
          <select
            value={supportRole}
            onChange={(e) => setSupportRole(e.target.value as "XFTS_SUPPORT" | "XFTS_SUPERADMIN")}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            aria-label="Papel da sessão de suporte"
          >
            <option value="XFTS_SUPPORT">Suporte XFTS (somente leitura)</option>
            <option value="XFTS_SUPERADMIN">Superadmin XFTS (leitura e escrita)</option>
          </select>
          <Input
            value={supportTicket}
            onChange={(e) => setSupportTicket(e.target.value)}
            placeholder="Nº do ticket (opcional)"
            className="h-9"
          />
          <Input
            value={supportReason}
            onChange={(e) => setSupportReason(e.target.value)}
            placeholder="Motivo do acesso (obrigatório, fica na auditoria)"
            className="h-9"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={supportAccess}
            disabled={busy}
            className="justify-start"
          >
            <LifeBuoy className="mr-2 h-4 w-4" /> Gerar acesso de suporte
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={loadHistory}
        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <History className="h-3.5 w-3.5" />
        {historyOpen ? "Ocultar alterações" : "Ver alterações deste produto"}
      </button>

      {historyOpen && (
        <div className="mt-2 space-y-1.5">
          {history === null && <p className="text-xs text-muted-foreground">Carregando…</p>}
          {history?.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma alteração manual registrada.</p>
          )}
          {(history ?? []).map((entry) => {
            const changes = diffAuditFields(entry.before, entry.after);
            return (
              <div key={entry.id} className="rounded-md bg-muted/40 p-2 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-medium text-foreground">
                    {auditActionLabel(entry.action)}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  por {entry.actor_email ?? "—"}
                  {entry.reason ? ` · motivo: ${entry.reason}` : ""}
                </p>
                {changes.map((c) => (
                  <p key={c.field} className="text-muted-foreground">
                    {c.label}: <span className="line-through">{c.before ?? "—"}</span> →{" "}
                    <span className="font-medium text-primary">{c.after ?? "—"}</span>
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
