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
import { LeadsByUtmReport } from "@/components/admin/LeadsByUtmReport";

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


type Attribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landing: string | null;
};

function pickAttribution(r: FormSubmissionRow, model: "first" | "last"): Attribution {
  return model === "last"
    ? {
        source: r.lt_utm_source,
        medium: r.lt_utm_medium,
        campaign: r.lt_utm_campaign,
        term: r.lt_utm_term,
        content: r.lt_utm_content,
        gclid: r.lt_gclid,
        fbclid: r.lt_fbclid,
        referrer: r.lt_referrer,
        landing: r.lt_landing_page,
      }
    : {
        source: r.utm_source,
        medium: r.utm_medium,
        campaign: r.utm_campaign,
        term: r.utm_term,
        content: r.utm_content,
        gclid: r.gclid,
        fbclid: r.fbclid,
        referrer: r.referrer,
        landing: r.landing_page,
      };
}

function isDifferent(r: FormSubmissionRow) {
  const a = pickAttribution(r, "first");
  const b = pickAttribution(r, "last");
  return ([
    "source",
    "medium",
    "campaign",
    "term",
    "content",
    "gclid",
    "fbclid",
    "referrer",
  ] as const).some(
    (k) => (a[k] ?? "") !== (b[k] ?? "")
  );
}

const IMPACT_WEIGHTS = {
  source: 5,
  campaign: 4,
  medium: 3,
  content: 2,
  term: 2,
  gclid: 2,
  fbclid: 2,
  referrer: 1,
} as const;

function impactScore(r: FormSubmissionRow) {
  const a = pickAttribution(r, "first");
  const b = pickAttribution(r, "last");
  let score = 0;
  for (const [key, weight] of Object.entries(IMPACT_WEIGHTS) as [
    keyof typeof IMPACT_WEIGHTS,
    number,
  ][]) {
    if ((a[key] ?? "") !== (b[key] ?? "")) score += weight;
  }
  return score;
}



function AttributionCell({ a }: { a: Attribution }) {
  return (
    <>
      <span className="block text-xs text-muted-foreground">
        {[a.source, a.medium, a.campaign].filter(Boolean).join(" · ") ||
          (a.referrer ? `ref: ${a.referrer}` : "direto")}
      </span>
      {(a.term || a.content || a.gclid || a.fbclid || a.landing) && (
        <span className="block text-[11px] text-muted-foreground/80">
          {[
            a.term,
            a.content,
            a.gclid ? `gclid: ${a.gclid}` : null,
            a.fbclid ? `fbclid: ${a.fbclid}` : null,
            a.landing,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      )}
    </>
  );
}

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
  const [compare, setCompare] = useState(false);
  const [divergence, setDivergence] = useState<"all" | "diff" | "same">("all");
  const [sort, setSort] = useState<"recent" | "impact">("recent");
  const [search, setSearch] = useState("");


  const readWindow = useServerFn(getAttributionWindow);
  const saveWindowFn = useServerFn(setAttributionWindow);
  const [windowDays, setWindowDays] = useState<number>(DEFAULT_ATTRIBUTION_WINDOW_DAYS);
  const [savingWindow, setSavingWindow] = useState(false);
  const [windowMessage, setWindowMessage] = useState("");

  const saveWindow = async (days: number) => {
    setSavingWindow(true);
    setWindowMessage("");
    try {
      const res = await saveWindowFn({ data: { window_days: days } });
      setWindowDays(res.window_days);
      setAttributionWindowDays(res.window_days);
      setWindowMessage(`Janela salva: ${res.window_days} dias.`);
    } catch (e) {
      setWindowMessage(e instanceof Error ? e.message : "Não foi possível salvar a janela.");
    } finally {
      setSavingWindow(false);
    }
  };


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
    readWindow()
      .then((res) => {
        setWindowDays(res.window_days);
        setAttributionWindowDays(res.window_days);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const visibleRows = useMemo(() => {
    let list = rows;
    if (divergence === "diff") list = list.filter((r) => isDifferent(r));
    if (divergence === "same") list = list.filter((r) => !isDifferent(r));
    if (sort === "impact") {
      list = [...list].sort((a, b) => {
        const d = impactScore(b) - impactScore(a);
        if (d !== 0) return d;
        return b.created_at.localeCompare(a.created_at);
      });
    }
    return list;
  }, [rows, divergence, sort]);

  const kpis = useMemo(() => {
    const total = visibleRows.length;
    const ok = visibleRows.filter((r) => r.status === "sent").length;
    const diff = visibleRows.filter((r) => isDifferent(r)).length;
    return { total, ok, fail: total - ok, diff };
  }, [visibleRows]);


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
        <button
          onClick={() => setCompare((v) => !v)}
          className={`ml-2 mt-3 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            compare
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {compare ? "Comparação lado a lado ativa" : "Comparar first × last"}
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          {compare
            ? "Mostrando first-touch e last-touch lado a lado para cada protocolo; os filtros de UTM seguem o modelo selecionado."
            : model === "first"
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


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Envios no filtro", value: kpis.total },
          { label: "Entregues", value: kpis.ok },
          { label: "Com falha", value: kpis.fail },
          { label: "Divergentes (first × last)", value: kpis.diff },
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
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Atribuição</label>
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={divergence}
              onChange={(e) => setDivergence(e.target.value as "all" | "diff" | "same")}
            >
              <option value="all">Todos os protocolos</option>
              <option value="diff">Apenas divergentes</option>
              <option value="same">Apenas iguais</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Ordenar por</label>
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={sort}
              onChange={(e) => setSort(e.target.value as "recent" | "impact")}
            >
              <option value="recent">Mais recentes</option>
              <option value="impact">Impacto da divergência</option>
            </select>
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

      <LeadsByUtmReport rows={visibleRows} model={model} />

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Protocolo</th>
                  <th className="px-4 py-3">Tela</th>
                  {compare ? (
                    <>
                      <th className="px-4 py-3">First-touch</th>
                      <th className="px-4 py-3">Last-touch</th>
                    </>
                  ) : (
                    <th className="px-4 py-3">Origem</th>
                  )}
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duração</th>
                </tr>
              </thead>
              <tbody>
                {!loading && visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={compare ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum envio encontrado para esse filtro.
                    </td>
                  </tr>
                )}

                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-foreground">{r.reference_id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {TELA_LABEL[r.tela] ?? r.tela ?? "—"}
                    </td>
                    {compare ? (
                      <>
                        <td className="px-4 py-3 align-top">
                          <span className="block text-xs font-medium text-foreground">
                            {r.botao ? BOTAO_LABEL[r.botao] ?? r.botao : "—"}
                          </span>
                          <AttributionCell a={pickAttribution(r, "first")} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <AttributionCell a={pickAttribution(r, "last")} />
                          {isDifferent(r) ? (
                            <Badge variant="destructive" className="mt-1">Divergente</Badge>
                          ) : (
                            <Badge variant="secondary" className="mt-1">Igual</Badge>
                          )}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3">
                        <span className="block text-xs font-medium text-foreground">
                          {r.botao ? BOTAO_LABEL[r.botao] ?? r.botao : "—"}
                        </span>
                        <AttributionCell a={pickAttribution(r, model)} />
                      </td>
                    )}


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
