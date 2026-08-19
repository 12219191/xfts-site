import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const ATTRIBUTION_WINDOW_OPTIONS = [7, 14, 30, 60, 90] as const;
export const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;

const windowSchema = z.object({
  window_days: z
    .number()
    .int()
    .refine((v) => (ATTRIBUTION_WINDOW_OPTIONS as readonly number[]).includes(v), {
      message: "Janela inválida",
    }),
});

/** Leitura pública da janela de atribuição (usada pelo rastreamento no navegador). */
export const getAttributionWindow = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ window_days: number }> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const url = process.env["SUPABASE_URL"]!;
    if (!key || !url) return { window_days: DEFAULT_ATTRIBUTION_WINDOW_DAYS };

    const supabasePublic = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data } = await supabasePublic
      .from("app_settings")
      .select("value")
      .eq("key", "attribution")
      .maybeSingle();

    const days = (data?.value as { window_days?: number } | null)?.window_days;
    return {
      window_days:
        typeof days === "number" && days > 0 ? days : DEFAULT_ATTRIBUTION_WINDOW_DAYS,
    };
  },
);

/** Atualização da janela de atribuição — apenas administradores. */
export const setAttributionWindow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => windowSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ window_days: number }> => {
    const { data: adminRow } = await context.supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!adminRow) throw new Error("Acesso restrito a administradores.");

    const { error } = await context.supabase
      .from("app_settings")
      .upsert({ key: "attribution", value: { window_days: data.window_days } });
    if (error) throw new Error(error.message);

    return { window_days: data.window_days };
  });
