import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { discardEmail, flushEmails, getEmailQueue, retryEmail } from "@/lib/ops-monitor.functions";
import type { EmailQueueRow, EmailQueueStats } from "@/lib/email-queue.server";

type StatusFilter = "todos" | "pending" | "sent" | "failed" | "suppressed" | "discarded";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando envio",
  sent: "Enviado",
  failed: "Tentativas esgotadas",
  suppressed: "Bloqueado pelo destinatário",
  discarded: "Descartado",
};

const TEMPLATE_LABEL: Record<string, string> = {
  "pagamento-falhou": "Cobrança — pagamento falhou",
  "alerta-operacional": "Alerta operacional (interno)",
};

function dateTimeBR(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
        <CheckCircle2 className="h-3 w-3" /> Enviado
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
  if (status === "suppressed") return <Badge variant="secondary">Bloqueado</Badge>;
  if (status === "discarded") return <Badge variant="secondary">Descartado</Badge>;
  return (
    <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
      <Clock className="h-3 w-3" /> Aguardando
    </Badge>
  );
}

/** Fila de e-mails: acompanha entregas, reenvia e descarta mensagens. */
export function EmailQueuePanel() {
  const [rows, setRows] = useState<EmailQueueRow[]>([]);
  const [stats, setStats] = useState<EmailQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);
  const [discardId, setDiscardId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getEmailQueue({ data: { status } });
    if ("error" in result) toast.error(result.error);
    else {
      setRows(result.rows);
      setStats(result.stats);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const doRetry = async (id: string) => {
    setBusy(id);
    const result = await retryEmail({ data: { id } });
    setBusy(null);
    if ("error" in result) toast.error(result.error);
    else toast.success("E-mail enviado.");
    void load();
  };

  const doDiscard = async (id: string) => {
    if (reason.trim().length < 5) {
      toast.error("Informe o motivo do descarte (mínimo 5 caracteres).");
      return;
    }
    setBusy(id);
    const result = await discardEmail({ data: { id, reason } });
    setBusy(null);
    if ("error" in result) toast.error(result.error);
    else {
      toast.success("E-mail descartado.");
      setDiscardId(null);
      setReason("");
    }
    void load();
  };

  const doFlush = async () => {
    setFlushing(true);
    const result = await flushEmails({});
    setFlushing(false);
    if ("error" in result) toast.error(result.error);
    else toast.success("Fila processada.");
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Fila de e-mails</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Todo e-mail de cobrança e alerta interno passa pela fila. Se o envio falhar, o
            sistema tenta novamente sozinho (1min, 5min, 15min, 1h e 6h) até 6 tentativas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void doFlush()} disabled={flushing}>
            {flushing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Processar agora
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Enviados (24h)", value: stats.enviados24h, icon: Mail },
            { label: "Aguardando", value: stats.pendentes, icon: Clock },
            { label: "Parados há +30min", value: stats.presos, icon: AlertTriangle },
            { label: "Tentativas esgotadas", value: stats.esgotados, icon: AlertTriangle },
          ].map((card) => (
            <Card key={card.label} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <card.icon className="h-3.5 w-3.5" /> {card.label}
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["todos", "pending", "failed", "sent", "suppressed", "discarded"] as StatusFilter[]).map(
          (s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </Button>
          ),
        )}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando fila...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum e-mail nesta situação.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {TEMPLATE_LABEL[row.template] ?? row.template} · {row.recipient}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.attempts} tentativa(s) ·{" "}
                        {row.status === "pending"
                          ? `próxima ${dateTimeBR(row.next_attempt_at)}`
                          : `em ${dateTimeBR(row.sent_at ?? row.created_at)}`}{" "}
                        · {row.environment === "live" ? "Produção" : "Teste"}
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
                            Enviar agora
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDiscardId(discardId === row.id ? null : row.id)}
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
