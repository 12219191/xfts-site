import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const filterSchema = z.object({
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  tela: z.string().max(120).optional(),
  botao: z.string().max(80).optional(),
  cta_page: z.string().max(80).optional(),
  cta_placement: z.string().max(40).optional(),
  cta_id: z.string().max(120).optional(),
  utm_source: z.string().max(160).optional(),
  utm_campaign: z.string().max(160).optional(),
  status: z.string().max(40).optional(),
  model: z.enum(["first", "last"]).optional(),
  search: z.string().max(120).optional(),
  crm_status: z.string().max(20).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export type FormSubmissionFilters = z.infer<typeof filterSchema>;

export type FormSubmissionRow = {
  id: string;
  reference_id: string;
  form_type: string;
  tela: string;
  status: string;
  http_status: number | null;
  duration_ms: number;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  segmento: string | null;
  empresa: string | null;
  assunto: string | null;
  mensagem: string | null;
  source: string | null;
  botao: string | null;
  cta_id: string | null;
  cta_label: string | null;
  cta_page: string | null;
  cta_placement: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landing_page: string | null;
  lt_utm_source: string | null;
  lt_utm_medium: string | null;
  lt_utm_campaign: string | null;
  lt_utm_term: string | null;
  lt_utm_content: string | null;
  lt_gclid: string | null;
  lt_fbclid: string | null;
  lt_referrer: string | null;
  lt_landing_page: string | null;
  error_message: string | null;
  crm_status: string | null;
  crm_lead_id: string | null;
  crm_error: string | null;
  crm_synced_at: string | null;
  crm_attempts: number | null;
  created_at: string;
};

export const listFormSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filterSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ rows: FormSubmissionRow[] }> => {
    let query = context.supabase
      .from("form_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (data.from) query = query.gte("created_at", new Date(`${data.from}T00:00:00`).toISOString());
    if (data.to) query = query.lte("created_at", new Date(`${data.to}T23:59:59`).toISOString());
    if (data.tela) query = query.eq("tela", data.tela);
    if (data.botao) query = query.eq("botao", data.botao);
    if (data.cta_page) query = query.eq("cta_page", data.cta_page);
    if (data.cta_id) query = query.eq("cta_id", data.cta_id);
    if (data.cta_placement) query = query.eq("cta_placement", data.cta_placement);
    const prefix = data.model === "last" ? "lt_" : "";
    if (data.utm_source) query = query.ilike(`${prefix}utm_source`, data.utm_source);
    if (data.utm_campaign) query = query.ilike(`${prefix}utm_campaign`, data.utm_campaign);
    if (data.status) query = query.eq("status", data.status);
    if (data.crm_status) query = query.eq("crm_status", data.crm_status);
    if (data.search) {
      const term = `%${data.search}%`;
      query = query.or(
        `reference_id.ilike.${term},email.ilike.${term},nome.ilike.${term},cta_id.ilike.${term},cta_label.ilike.${term}`
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as FormSubmissionRow[] };
  });
