/**
 * Envio de leads dos formulários do site para o FLEXUS | CRM.
 *
 * Canal servidor→servidor assinado com HMAC-SHA256 usando FLEXUS_APP_KEY_CRM,
 * no mesmo padrão do provisionamento (`provisioning.server.ts`).
 */
import { appApiKey, signBody, signBodyHex } from "@/lib/sso.server";
import { loadCrmSettings } from "@/lib/crm-settings.server";

export type CrmLeadStatus = "created" | "updated" | "pending" | "failed" | "skipped";

export interface CrmLeadInput {
  reference_id: string;
  form_type: string;
  tela?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  segmento?: string | null;
  assunto?: string | null;
  mensagem?: string | null;
  cta_id?: string | null;
  cta_label?: string | null;
  cta_page?: string | null;
  cta_placement?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  li_fat_id?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  lt_utm_source?: string | null;
  lt_utm_medium?: string | null;
  lt_utm_campaign?: string | null;
  lt_utm_term?: string | null;
  lt_utm_content?: string | null;
  lt_gclid?: string | null;
  lt_gbraid?: string | null;
  lt_wbraid?: string | null;
  lt_fbclid?: string | null;
  lt_li_fat_id?: string | null;
  lt_referrer?: string | null;
  lt_landing_page?: string | null;
}

export interface CrmLeadResult {
  status: CrmLeadStatus;
  leadId: string | null;
  error?: string;
  /** Código HTTP da resposta do CRM, quando houve resposta. */
  httpStatus?: number;
  /** Formato de assinatura usado nesta tentativa. */
  signatureEncoding?: string;
}

/** Só formulários comerciais viram lead. Exclusão de dados é privacidade. */
export function shouldSendToCrm(formType: string): boolean {
  return formType === "contato" || formType === "demo";
}

function pick(payload: unknown, path: string): string | null {
  let cur: unknown = payload;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" || typeof cur === "number" ? String(cur) : null;
}

/** Aplica o mapeamento configurado: campo interno → nome do campo no CRM. */
function applyFieldMap(input: CrmLeadInput, map: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[map[key] ?? key] = value;
  }
  return out;
}

/**
 * Nunca lança: qualquer falha vira `pending` (será reenviado) ou `failed`.
 * `pending` = problema temporário/endpoint ainda não disponível.
 */
export async function sendLeadToCrm(input: CrmLeadInput): Promise<CrmLeadResult> {
  const settings = await loadCrmSettings();

  if (!settings.enabled) {
    return { status: "skipped", leadId: null, error: "integração desativada no /admin" };
  }
  if (!settings.form_types.includes(input.form_type)) {
    return { status: "skipped", leadId: null, error: "tipo de formulário fora do escopo do CRM" };
  }

  const endpoint = settings.lead_url;
  if (!endpoint) return { status: "pending", leadId: null, error: "URL do CRM não configurada" };

  const secret = settings.auth_token || appApiKey("crm") || "";
  if (settings.auth_mode !== "none" && !secret) {
    return { status: "pending", leadId: null, error: "credencial do CRM não configurada" };
  }

  if (!input.email && !input.telefone) {
    return { status: "skipped", leadId: null, error: "sem e-mail ou telefone para identificar o lead" };
  }

  const body = JSON.stringify({
    ...applyFieldMap(input, settings.field_map),
    origem: settings.origem,
    timestamp: new Date().toISOString(),
  });

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.auth_mode === "hmac") {
      headers[settings.signature_header] =
        settings.signature_encoding === "base64url"
          ? await signBody(secret, body)
          : await signBodyHex(secret, body);
    } else if (settings.auth_mode === "bearer") {
      headers[settings.auth_header] = `Bearer ${secret}`;
    } else if (settings.auth_mode === "api_key") {
      headers[settings.auth_header] = secret;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(settings.timeout_ms),
    });

    if (!res.ok) {
      const permanent = res.status === 400 || res.status === 401 || res.status === 403;
      const raw = (await res.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 200);
      const hint =
        res.status === 401 || res.status === 403
          ? " — assinatura recusada: confira se FLEXUS_APP_KEY_CRM é idêntica nos dois projetos"
          : "";
      return {
        status: permanent ? "failed" : "pending",
        leadId: null,
        httpStatus: res.status,
        signatureEncoding: settings.signature_encoding,
        error: `HTTP ${res.status}${raw ? ` — ${raw}` : ""}${hint}`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Um SPA devolve HTML para qualquer rota: o endpoint ainda não existe.
      return {
        status: "pending",
        leadId: null,
        httpStatus: res.status,
        signatureEncoding: settings.signature_encoding,
        error: "endpoint de lead ainda não implementado no CRM",
      };
    }

    const payload = (await res.json()) as unknown;
    const action = pick(payload, settings.response_action_path) === "created" ? "created" : "updated";
    return {
      status: action,
      leadId: pick(payload, settings.response_lead_id_path),
      httpStatus: res.status,
      signatureEncoding: settings.signature_encoding,
    };
  } catch (e) {
    return {
      status: "pending",
      leadId: null,
      error: e instanceof Error ? e.message : "falha de rede",
    };
  }
}

/** Reenvia protocolos pendentes. Usado pelo retry automático e pelo /admin. */
export async function retryPendingCrmLeads(limit = 25): Promise<{ processed: number; ok: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("form_submissions")
    .select("*")
    .eq("crm_status", "pending")
    .lt("crm_attempts", 10)
    .order("created_at", { ascending: true })
    .limit(limit);

  let ok = 0;
  for (const row of rows ?? []) {
    const result = await sendLeadToCrm(rowToLeadInput(row));
    if (result.status === "created" || result.status === "updated") ok++;
    await supabaseAdmin
      .from("form_submissions")
      .update({
        crm_status: result.status,
        crm_lead_id: result.leadId,
        crm_error: result.error ?? null,
        crm_synced_at: new Date().toISOString(),
        crm_attempts: (row.crm_attempts ?? 0) + 1,
      })
      .eq("id", row.id);
  }

  return { processed: rows?.length ?? 0, ok };
}

/** Converte uma linha de form_submissions no payload do lead. */
export function rowToLeadInput(row: Record<string, unknown>): CrmLeadInput {
  const s = (k: string) => (row[k] as string | null) ?? null;
  return {
    reference_id: String(row["reference_id"] ?? ""),
    form_type: String(row["form_type"] ?? ""),
    tela: s("tela"),
    nome: s("nome"),
    email: s("email"),
    telefone: s("telefone"),
    empresa: s("empresa"),
    segmento: s("segmento"),
    assunto: s("assunto"),
    mensagem: s("mensagem"),
    cta_id: s("cta_id"),
    cta_label: s("cta_label"),
    cta_page: s("cta_page"),
    cta_placement: s("cta_placement"),
    utm_source: s("utm_source"),
    utm_medium: s("utm_medium"),
    utm_campaign: s("utm_campaign"),
    utm_term: s("utm_term"),
    utm_content: s("utm_content"),
    gclid: s("gclid"),
    gbraid: s("gbraid"),
    wbraid: s("wbraid"),
    fbclid: s("fbclid"),
    li_fat_id: s("li_fat_id"),
    fbc: s("fbc"),
    fbp: s("fbp"),
    referrer: s("referrer"),
    landing_page: s("landing_page"),
    lt_utm_source: s("lt_utm_source"),
    lt_utm_medium: s("lt_utm_medium"),
    lt_utm_campaign: s("lt_utm_campaign"),
    lt_utm_term: s("lt_utm_term"),
    lt_utm_content: s("lt_utm_content"),
    lt_gclid: s("lt_gclid"),
    lt_gbraid: s("lt_gbraid"),
    lt_wbraid: s("lt_wbraid"),
    lt_fbclid: s("lt_fbclid"),
    lt_li_fat_id: s("lt_li_fat_id"),
    lt_referrer: s("lt_referrer"),
    lt_landing_page: s("lt_landing_page"),
  };
}
