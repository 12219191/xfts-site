import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { getCronHealth } from "@/lib/ops-monitor.functions";
import type { CronHealth } from "@/lib/cron-monitor.server";

function dateTimeBR(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

const JOB_LABEL: Record<string, string> = {
  reliability: "Confiabilidade",
  dunning: "Cobrança",
  "email-queue": "Fila de e-mails",
  "crm-retry": "Leads para o CRM",
};

/** Situação das rotinas automáticas: última execução, atrasos e falhas. */
export function CronMonitorPanel() {
  const [data, setData] = useState<CronHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCronHealth({});
    if ("error" in result) toast.error(result.error);
    else setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Rotinas automáticas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada rotina registra quando rodou, quanto tempo levou e se deu certo. Assim é
            possível perceber rapidamente quando algo parou de rodar em silêncio.
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

      <div className="grid gap-3 md:grid-cols-2">
        {(data?.jobs ?? []).map((job) => {
          const problema = job.nuncaExecutou || job.atrasada || job.ultimaOk === false;
          return (
            <Card
              key={job.key}
              className={problema ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{job.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{job.description}</p>
                  </div>
                  {job.nuncaExecutou ? (
                    <Badge variant="secondary">Sem registro</Badge>
                  ) : job.atrasada ? (
                    <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
                      <AlertTriangle className="h-3 w-3" /> Atrasada
                    </Badge>
                  ) : job.ultimaOk === false ? (
                    <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
                      <AlertTriangle className="h-3 w-3" /> Última falhou
                    </Badge>
                  ) : (
                    <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                      <CheckCircle2 className="h-3 w-3" /> Em dia
                    </Badge>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Última execução</dt>
                    <dd className="font-medium text-foreground">{dateTimeBR(job.ultimaExecucao)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Esperado</dt>
                    <dd className="font-medium text-foreground">
                      a cada {job.everyMinutes} min
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Execuções (7 dias)</dt>
                    <dd className="font-medium text-foreground">
                      {job.execucoes7d} · {job.falhas7d} falha(s)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Duração</dt>
                    <dd className="font-medium text-foreground">
                      {job.duracaoMs != null ? `${job.duracaoMs} ms` : "—"}
                    </dd>
                  </div>
                </dl>

                {job.ultimoErro && (
                  <p className="mt-3 rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                    {job.ultimoErro}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Últimas execuções</p>
          </div>
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando registros...
            </div>
          ) : (data?.execucoes.length ?? 0) === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma execução registrada nos últimos 7 dias.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(data?.execucoes ?? []).map((run) => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {JOB_LABEL[run.job] ?? run.job}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {dateTimeBR(run.started_at)} · {run.duration_ms} ms
                    </p>
                  </div>
                  {run.ok ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">ok</Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
                      falha
                    </Badge>
                  )}
                  {run.error && (
                    <p className="w-full rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                      {run.error}
                    </p>
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
