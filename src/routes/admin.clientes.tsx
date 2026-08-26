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
import { LifeBuoy, Search, Users } from "lucide-react";

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
                <span className="text-xs text-muted-foreground">
                  cliente desde {fmtDate(row.createdAt)}
                </span>
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
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const saveSeats = async () => {
    setBusy(true);
    try {
      const result = await updateCustomerSeats({
        data: {
          subscriptionId: product.subscriptionId,
          seats: seats.trim() === "" ? null : Number(seats),
          reason,
        },
      });
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Limite de usuários atualizado.");
        setReason("");
        onDone();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    }
    setBusy(false);
  };

  const supportAccess = async () => {
    if (reason.trim().length < 5) {
      toast.error("Informe o motivo do acesso de suporte.");
      return;
    }
    setBusy(true);
    try {
      const result = await createSupportAccessLink({
        data: { userId, app: product.app, reason },
      });
      if ("error" in result) toast.error(result.error);
      else {
        await navigator.clipboard.writeText(result.url).catch(() => undefined);
        toast.success("Link de suporte gerado e copiado (válido por poucos minutos).");
        setReason("");
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
        Usuários: {product.seatsUsed ?? 0} / {product.seatsLimit ?? "—"}
        {product.seatsOverride !== null ? " (limite manual)" : ""}
      </p>

      <div className="mt-3 grid gap-2">
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
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (obrigatório, fica na auditoria)"
          className="h-9"
        />
        <Button size="sm" variant="ghost" onClick={supportAccess} disabled={busy} className="justify-start">
          <LifeBuoy className="mr-2 h-4 w-4" /> Gerar acesso de suporte
        </Button>
      </div>
    </div>
  );
}
