import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const filterSchema = z.object({
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  tela: z.string().max(120).optional(),
  status: z.string().max(40).optional(),
  search: z.string().max(120).optional(),
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
  error_message: string | null;
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
    if (data.status) query = query.eq("status", data.status);
    if (data.search) {
      const term = `%${data.search}%`;
      query = query.or(
        `reference_id.ilike.${term},email.ilike.${term},nome.ilike.${term}`
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as FormSubmissionRow[] };
  });
