import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listFormSubmissions, type FormSubmissionRow } from "@/lib/form-submissions.functions";
import {
  ATTRIBUTION_WINDOW_OPTIONS,
  DEFAULT_ATTRIBUTION_WINDOW_DAYS,
  getAttributionWindow,
  setAttributionWindow,
} from "@/lib/attribution-settings.functions";
import { setAttributionWindowDays } from "@/lib/attribution";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  sent: "Enviado",
  rejected: "Recusado",
  network_error: "Falha de conexão",
  not_configured: "Não configurado",
};

const TELA_LABEL: Record<string, string> = {
  "/": "Home (Demo)",
  "/contato": "Contato",
  "/exclusao-de-dados": "Exclusão de Dados",
};

const BOTAO_LABEL: Record<string, string> = {
  home_demo: "Home · Solicitar demonstração",
  contato_mensagem: "Contato · Enviar mensagem",
  exclusao_dados: "Exclusão de dados · Enviar solicitação",
};


function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}

export function FormSubmissionsPanel() {
  const fetchRows = useServerFn(listFormSubmissions);
  const [rows, setRows] = useState<FormSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tela, setTela] = useState("");
  const [botao, setBotao] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [status, setStatus] = useState("");
  const [model, setModel] = useState<"first" | "last">("first");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchRows({
        data: {
          from: from || undefined,
          to: to || undefined,
          tela: tela || undefined,
          botao: botao || undefined,
          utm_source: utmSource.trim() || undefined,
          utm_campaign: utmCampaign.trim() || undefined,
          status: status || undefined,
          model,
          search: search.trim() || undefined,
          limit: 200,
        },
      });
      setRows(result.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os envios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.status === "sent").length;
    return { total, ok, fail: total - ok };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Envios de formulários</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte protocolos, status e origem de cada envio.
        </p>
        <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-1">
          {([
            { id: "first", label: "First-touch" },
            { id: "last", label: "Last-touch" },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setModel(opt.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                model === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {model === "first"
            ? "Atribuindo ao primeiro contato do visitante com o site (first-touch)."
            : "Atribuindo à última origem antes do envio (last-touch)."}
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-[220px]">
            <p className="text-sm font-medium text-foreground">Janela de atribuição</p>
            <p className="text-xs text-muted-foreground">
              Período em que a origem do visitante continua válida para first-touch e last-touch.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border p-1">
            {ATTRIBUTION_WINDOW_OPTIONS.map((days) => (
              <button
                key={days}
                disabled={savingWindow}
                onClick={() => saveWindow(days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  windowDays === days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
          {windowMessage && (
            <span className="text-xs text-muted-foreground">{windowMessage}</span>
          )}
        </CardContent>
      </Card>


      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Envios no filtro", value: kpis.total },
          { label: "Entregues", value: kpis.ok },
          { label: "Com falha", value: kpis.fail },
        ].map((k) => (
          <Card key={k.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="grid gap-3 p-4 md:grid-cols-6">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Tela</label>
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={tela}
              onChange={(e) => setTela(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="/">Home (Demo)</option>
              <option value="/contato">Contato</option>
              <option value="/exclusao-de-dados">Exclusão de Dados</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="sent">Enviado</option>
              <option value="rejected">Recusado</option>
              <option value="network_error">Falha de conexão</option>
              <option value="not_configured">Não configurado</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Botão</label>
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={botao}
              onChange={(e) => setBotao(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="home_demo">Home · Solicitar demonstração</option>
              <option value="contato_mensagem">Contato · Enviar mensagem</option>
              <option value="exclusao_dados">Exclusão · Enviar solicitação</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">utm_source</label>
            <Input
              placeholder="google, meta..."
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">utm_campaign</label>
            <Input
              placeholder="black-friday"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div className="grid gap-1 md:col-span-2">
            <label className="text-xs text-muted-foreground">Protocolo, nome ou e-mail</label>
            <div className="flex gap-2">
              <Input
                placeholder="XF-260819-ABCDE"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
              <Button onClick={load} disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Protocolo</th>
                  <th className="px-4 py-3">Tela</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duração</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum envio encontrado para esse filtro.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-foreground">{r.reference_id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {TELA_LABEL[r.tela] ?? r.tela ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-medium text-foreground">
                        {r.botao ? BOTAO_LABEL[r.botao] ?? r.botao : "—"}
                      </span>
                      {(() => {
                        const a = model === "last"
                          ? {
                              source: r.lt_utm_source,
                              medium: r.lt_utm_medium,
                              campaign: r.lt_utm_campaign,
                              term: r.lt_utm_term,
                              content: r.lt_utm_content,
                              referrer: r.lt_referrer,
                              landing: r.lt_landing_page,
                            }
                          : {
                              source: r.utm_source,
                              medium: r.utm_medium,
                              campaign: r.utm_campaign,
                              term: r.utm_term,
                              content: r.utm_content,
                              referrer: r.referrer,
                              landing: r.landing_page,
                            };
                        return (
                          <>
                            <span className="block text-xs text-muted-foreground">
                              {[a.source, a.medium, a.campaign].filter(Boolean).join(" · ") ||
                                (a.referrer ? `ref: ${a.referrer}` : "direto")}
                            </span>
                            {(a.term || a.content || a.landing) && (
                              <span className="block text-[11px] text-muted-foreground/80">
                                {[a.term, a.content, a.landing].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3">
                      <span className="block font-medium text-foreground">{r.nome ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">{r.email ?? ""}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={r.status === "sent" ? "default" : "destructive"}>
                        {STATUS_LABEL[r.status] ?? r.status}
                        {r.http_status ? ` · ${r.http_status}` : ""}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.duration_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
