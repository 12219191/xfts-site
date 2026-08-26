import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import {
  discardProvision,
  getProvisionQueue,
  retryProvision,
} from "@/lib/reliability.functions";
import type { ProvisionQueueRow } from "@/lib/reliability.server";

type StatusFilter = "todos" | "pending" | "failed" | "delivered" | "discarded";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando reenvio",
  failed: "Tentativas esgotadas",
  delivered: "Entregue",
  discarded: "Descartado",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Nova assinatura",
  updated: "Mudança de plano",
  canceled: "Cancelamento",
  payment_failed: "Falha de pagamento",
};

function dateTimeBR(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "delivered") {
    return (
      <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
        <CheckCircle2 className="h-3 w-3" /> Entregue
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
        <AlertTriangle className="h-3 w-3" /> Esgotado
      </Badge>
    );
  }
  if (status === "discarded") {
    return <Badge variant="secondary">Descartado</Badge>;
  }
  return (
    <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
      <Clock className="h-3 w-3" /> Aguardando
    </Badge>
  );
}

/** Fila de avisos enviados aos sistemas FLEXUS, com reenvio manual e descarte. */
export function ProvisionQueuePanel() {
  const [rows, setRows] = useState<ProvisionQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [discardId, setDiscardId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getProvisionQueue({ data: { status } });
    if ("error" in result) toast.error(result.error);
    else setRows(result.rows);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const doRetry = async (id: string) => {
    setBusy(id);
    const result = await retryProvision({ data: { id } });
    setBusy(null);
    if ("error" in result) toast.error(result.error);
    else toast.success("Aviso reenviado com sucesso.");
    void load();
  };

  const doDiscard = async (id: string) => {
    if (reason.trim().length < 5) {
      toast.error("Informe o motivo do descarte (mínimo 5 caracteres).");
      return;
    }
    setBusy(id);
    const result = await discardProvision({ data: { id, reason } });
    setBusy(null);
    if ("error" in result) toast.error(result.error);
    else {
      toast.success("Item descartado.");
      setDiscardId(null);
      setReason("");
    }
    void load();
  };

  const pendentes = rows.filter((r) => r.status === "pending").length;
  const esgotados = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Provisionamento</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Avisos enviados aos sistemas FLEXUS quando um cliente assina, muda de plano,
            cancela ou fica com pagamento pendente. Falhas são reenviadas automaticamente com
            espera crescente (até 6 tentativas).
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

      {(pendentes > 0 || esgotados > 0) && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">{pendentes}</strong> aviso(s) aguardando
            reenvio e <strong className="text-foreground">{esgotados}</strong> com tentativas
            esgotadas.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["todos", "pending", "failed", "delivered", "discarded"] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s === "todos" ? "Todos" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando fila...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum item na fila — todos os avisos foram entregues.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.appName} · {EVENT_LABEL[row.event] ?? row.event}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.email ?? row.user_id?.slice(0, 8) ?? "—"} ·{" "}
                        {row.attempts} tentativa(s) · próxima {dateTimeBR(row.next_attempt_at)} ·{" "}
                        {row.environment === "live" ? "Produção" : "Teste"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.status} />
                      {(row.status === "pending" || row.status === "failed") && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void doRetry(row.id)}
                            disabled={busy === row.id}
                          >
                            {busy === row.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Reenviar agora
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDiscardId(discardId === row.id ? null : row.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {row.last_error && (
                    <p className="rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                      {row.last_error}
                    </p>
                  )}

                  {discardId === row.id && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
                      <Input
                        placeholder="Motivo do descarte"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-9 w-full sm:w-72"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void doDiscard(row.id)}
                        disabled={busy === row.id}
                      >
                        Confirmar descarte
                      </Button>
                    </div>
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
