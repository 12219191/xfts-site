import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getSsoHealth, testFlexusConnection } from "@/lib/reliability.functions";
import type { SsoAppHealth, SsoEventRow } from "@/lib/reliability.server";

type EventRow = SsoEventRow & { email: string | null };

const KIND_LABEL: Record<string, string> = {
  sso_issue: "Acesso gerado no hub",
  sso_verify: "Troca de token pelo sistema",
  entitlements: "Revalidação de acesso",
  provision: "Aviso de provisionamento",
  test: "Teste de conexão",
};

const SEMAFORO: Record<SsoAppHealth["semaforo"], { label: string; className: string }> = {
  verde: { label: "Saudável", className: "bg-primary/10 text-primary hover:bg-primary/10" },
  amarelo: {
    label: "Só recusas",
    className: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
  },
  vermelho: {
    label: "Com problema",
    className: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  },
  cinza: { label: "Sem movimento", className: "bg-muted text-muted-foreground" },
};

function dateTimeBR(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

/** Saúde do login único e das chamadas de acesso feitas pelos sistemas FLEXUS. */
export function SsoHealthPanel() {
  const [apps, setApps] = useState<SsoAppHealth[]>([]);
  const [eventos, setEventos] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [kind, setKind] = useState<string>("todos");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSsoHealth({ data: { environment: "todos" } });
    if ("error" in result) toast.error(result.error);
    else {
      setApps(result.apps);
      setEventos(result.eventos as EventRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runTest = async (app: string) => {
    setTesting(app);
    const result = await testFlexusConnection({ data: { app } });
    setTesting(null);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if (result.result.ok) toast.success(result.result.detalhe);
    else toast.error(result.result.detalhe);
    void load();
  };

  const filtered = kind === "todos" ? eventos : eventos.filter((e) => e.kind === kind);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Saúde do login único (SSO)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os acessos concedidos aos sistemas FLEXUS, os motivos de recusa e a
            disponibilidade de cada sistema. Nenhum token de acesso é armazenado.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => (
          <Card key={app.key} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {app.name}
                </span>
                <Badge className={SEMAFORO[app.semaforo].className}>
                  {SEMAFORO[app.semaforo].label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Acessos</p>
                  <p className="text-lg font-bold text-foreground">{app.acessos24h}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recusas</p>
                  <p className="text-lg font-bold text-foreground">{app.recusas24h}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Erros</p>
                  <p
                    className={`text-lg font-bold ${
                      app.erros24h > 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {app.erros24h}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Tempo médio {app.tempoMedioMs}ms · último acesso{" "}
                {dateTimeBR(app.ultimoSucessoAt)}
              </p>

              {!app.keyConfigured && (
                <p className="flex items-center gap-1.5 rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                  <KeyRound className="h-3.5 w-3.5" /> Chave de API não configurada.
                </p>
              )}

              {app.motivos.length > 0 && (
                <div className="space-y-1">
                  {app.motivos.slice(0, 3).map((m) => (
                    <p key={m.reason} className="text-xs text-muted-foreground">
                      {m.reason} · <strong>{m.total}</strong>
                    </p>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => void runTest(app.key)}
                disabled={testing === app.key}
              >
                {testing === app.key ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlugZap className="mr-2 h-4 w-4" />
                )}
                Testar conexão
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["todos", "sso_issue", "sso_verify", "entitlements", "provision", "test"].map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kind === k ? "default" : "outline"}
            onClick={() => setKind(k)}
          >
            {k === "todos" ? "Todos os registros" : KIND_LABEL[k]}
          </Button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {loading && filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando registros...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum registro ainda. Os acessos aparecem aqui a partir do próximo uso.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {KIND_LABEL[e.kind] ?? e.kind} · {e.app_key || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dateTimeBR(e.created_at)} · {e.email ?? "—"} · {e.duration_ms}ms
                      {e.reason ? ` · ${e.reason}` : ""}
                    </p>
                  </div>
                  {e.status === "ok" ? (
                    <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                      <CheckCircle2 className="h-3 w-3" /> Concedido
                    </Badge>
                  ) : (
                    <Badge
                      className={
                        e.status === "error"
                          ? "gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10"
                          : "gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"
                      }
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {e.status === "error" ? "Erro" : "Recusado"}
                    </Badge>
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
