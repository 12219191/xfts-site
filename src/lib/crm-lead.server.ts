/**
 * Envio de leads dos formulários do site para o FLEXUS | CRM.
 *
 * Canal servidor→servidor assinado com HMAC-SHA256 usando FLEXUS_APP_KEY_CRM,
 * no mesmo padrão do provisionamento (`provisioning.server.ts`).
 */
import { getFlexusApp } from "@/lib/flexus-apps";
import { appApiKey, signBody } from "@/lib/sso.server";

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
  fbclid?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  lt_utm_source?: string | null;
  lt_utm_medium?: string | null;
  lt_utm_campaign?: string | null;
  lt_utm_term?: string | null;
  lt_utm_content?: string | null;
  lt_gclid?: string | null;
  lt_fbclid?: string | null;
  lt_referrer?: string | null;
  lt_landing_page?: string | null;
}

export interface CrmLeadResult {
  status: CrmLeadStatus;
  leadId: string | null;
  error?: string;
}

/** Só formulários comerciais viram lead. Exclusão de dados é privacidade. */
export function shouldSendToCrm(formType: string): boolean {
  return formType === "contato" || formType === "demo";
}

/**
 * Nunca lança: qualquer falha vira `pending` (será reenviado) ou `failed`.
 * `pending` = problema temporário/endpoint ainda não disponível.
 */
export async function sendLeadToCrm(input: CrmLeadInput): Promise<CrmLeadResult> {
  const app = getFlexusApp("crm");
  const endpoint = app?.leadUrl;
  if (!endpoint) return { status: "pending", leadId: null, error: "endpoint do CRM não configurado" };

  const secret = appApiKey("crm");
  if (!secret) return { status: "pending", leadId: null, error: "FLEXUS_APP_KEY_CRM não configurada" };

  if (!input.email && !input.telefone) {
    return { status: "skipped", leadId: null, error: "sem e-mail ou telefone para identificar o lead" };
  }

  const body = JSON.stringify({
    ...input,
    origem: "site-xfts",
    timestamp: new Date().toISOString(),
  });

  try {
    const signature = await signBody(secret, body);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flexus-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const permanent = res.status === 400 || res.status === 401 || res.status === 403;
      return {
        status: permanent ? "failed" : "pending",
        leadId: null,
        error: `HTTP ${res.status}`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // Um SPA devolve HTML para qualquer rota: o endpoint ainda não existe.
      return { status: "pending", leadId: null, error: "endpoint de lead ainda não implementado no CRM" };
    }

    const payload = (await res.json()) as { lead_id?: string; action?: string };
    const action = payload.action === "created" ? "created" : "updated";
    return { status: action, leadId: payload.lead_id ?? null };
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
    fbclid: s("fbclid"),
    referrer: s("referrer"),
    landing_page: s("landing_page"),
    lt_utm_source: s("lt_utm_source"),
    lt_utm_medium: s("lt_utm_medium"),
    lt_utm_campaign: s("lt_utm_campaign"),
    lt_utm_term: s("lt_utm_term"),
    lt_utm_content: s("lt_utm_content"),
    lt_gclid: s("lt_gclid"),
    lt_fbclid: s("lt_fbclid"),
    lt_referrer: s("lt_referrer"),
    lt_landing_page: s("lt_landing_page"),
  };
}
