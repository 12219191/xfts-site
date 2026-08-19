import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getCrmSettings,
  saveCrmSettingsFn,
  testCrmConnection,
} from "@/lib/crm-settings.functions";
import {
  CRM_AUTH_MODE_OPTIONS,
  CRM_FORM_TYPE_OPTIONS,
  CRM_SOURCE_FIELDS,
  DEFAULT_CRM_SETTINGS,
  type CrmAuthMode,
  type CrmIntegrationSettings,
} from "@/lib/crm-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlugZap, Save } from "lucide-react";

const TEST_LABEL: Record<string, string> = {
  created: "Lead de teste criado no CRM.",
  updated: "Lead de teste atualizado no CRM.",
  pending: "Não respondeu agora — ficará na fila de reenvio.",
  failed: "O CRM recusou a chamada.",
  skipped: "Envio ignorado pela configuração atual.",
};

export function CrmIntegrationPanel() {
  const read = useServerFn(getCrmSettings);
  const save = useServerFn(saveCrmSettingsFn);
  const test = useServerFn(testCrmConnection);

  const [form, setForm] = useState<CrmIntegrationSettings>(DEFAULT_CRM_SETTINGS);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    read()
      .then((res) => {
        const { has_server_key, updated_at, ...settings } = res;
        setForm(settings);
        setHasServerKey(has_server_key);
        setUpdatedAt(updated_at);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (values: Partial<CrmIntegrationSettings>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const toggleFormType = (id: string) =>
    patch({
      form_types: form.form_types.includes(id)
        ? form.form_types.filter((t) => t !== id)
        : [...form.form_types, id],
    });

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await save({ data: form });
      setMessage("Configuração salva. Novos leads já usam esses ajustes.");
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const res = await test({});
      const label = TEST_LABEL[res.status] ?? res.status;
      if (res.status === "created" || res.status === "updated") setMessage(label);
      else setError(`${label}${res.error ? ` (${res.error})` : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no teste.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando configuração…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">FLEXUS | CRM — integração de leads</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste URL, autenticação e nomes de campos sem precisar de nova publicação.
        </p>
        {updatedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Última alteração: {new Date(updatedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Envio automático</p>
              <p className="text-xs text-muted-foreground">
                Quando desligado, os formulários continuam sendo registrados, mas não vão ao CRM.
              </p>
            </div>
            <Button
              variant={form.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => patch({ enabled: !form.enabled })}
            >
              {form.enabled ? "Ativado" : "Desativado"}
            </Button>
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">URL do endpoint de leads</label>
            <Input
              value={form.lead_url}
              onChange={(e) => patch({ lead_url: e.target.value })}
              placeholder="https://…/functions/v1/flexus-lead"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Tempo limite (ms)</label>
              <Input
                type="number"
                min={1000}
                max={30000}
                step={500}
                value={form.timeout_ms}
                onChange={(e) => patch({ timeout_ms: Number(e.target.value) || 10000 })}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Rótulo de origem</label>
              <Input value={form.origem} onChange={(e) => patch({ origem: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Formulários enviados ao CRM</label>
            <div className="flex flex-wrap gap-2">
              {CRM_FORM_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleFormType(opt.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    form.form_types.includes(opt.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm font-medium text-foreground">Autenticação</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CRM_AUTH_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => patch({ auth_mode: opt.id as CrmAuthMode })}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  form.auth_mode === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            ))}
          </div>

          {form.auth_mode === "hmac" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Header da assinatura</label>
                <Input
                  value={form.signature_header}
                  onChange={(e) => patch({ signature_header: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {hasServerKey
                    ? "Usando a chave FLEXUS_APP_KEY_CRM do servidor quando o campo abaixo estiver vazio."
                    : "Nenhuma chave de servidor detectada — informe o segredo abaixo."}
                </p>
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Formato da assinatura</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.signature_encoding}
                  onChange={(e) =>
                    patch({ signature_encoding: e.target.value as CrmSignatureEncoding })
                  }
                >
                  {CRM_SIGNATURE_ENCODING_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  O FLEXUS | CRM valida a assinatura em hexadecimal.
                </p>
              </div>
            </div>
          )}

          {(form.auth_mode === "bearer" || form.auth_mode === "api_key") && (
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Header de autenticação</label>
              <Input
                value={form.auth_header}
                onChange={(e) => patch({ auth_header: e.target.value })}
              />
            </div>
          )}

          {form.auth_mode !== "none" && (
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">
                Segredo / token {form.auth_mode === "hmac" ? "(opcional)" : ""}
              </label>
              <Input
                type="password"
                value={form.auth_token}
                onChange={(e) => patch({ auth_token: e.target.value })}
                placeholder="Deixe ******** para manter o valor atual"
              />
              <p className="text-xs text-muted-foreground">
                Guardado com acesso restrito a administradores e nunca exibido depois de salvo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-sm font-medium text-foreground">Mapeamento de campos</p>
            <p className="text-xs text-muted-foreground">
              Deixe em branco para enviar com o nome padrão. Preencha para renomear o campo no CRM.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CRM_SOURCE_FIELDS.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-xs text-muted-foreground">{f.label}</span>
                <Input
                  className="h-8"
                  value={form.field_map[f.id] ?? ""}
                  placeholder={f.id}
                  onChange={(e) =>
                    patch({ field_map: { ...form.field_map, [f.id]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Campo do ID na resposta</label>
              <Input
                value={form.response_lead_id_path}
                onChange={(e) => patch({ response_lead_id_path: e.target.value })}
                placeholder="lead_id ou data.id"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Campo da ação na resposta</label>
              <Input
                value={form.response_action_path}
                onChange={(e) => patch({ response_action_path: e.target.value })}
                placeholder="action"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {message && (
        <Badge variant="default" className="whitespace-normal text-left">
          {message}
        </Badge>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar configuração
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
          Enviar lead de teste
        </Button>
      </div>
    </div>
  );
}
