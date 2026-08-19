import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DunningRow {
  stripe_subscription_id: string;
  user_id: string | null;
  email: string | null;
  price_id: string | null;
  amount_due: number | null;
  failed_at: string;
  grace_until: string;
  last_stage: number;
  resolved_at: string | null;
  blocked_at: string | null;
  environment: string;
}

export interface DunningEmailRow {
  id: string;
  stripe_subscription_id: string;
  stage: number;
  email: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: adminRow } = await context.supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!adminRow) throw new Error("Acesso restrito a administradores.");
}

/** Lista as cobranças em aberto e os e-mails já enviados. */
export const getDunningOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ states: DunningRow[]; emails: DunningEmailRow[] }> => {
      await assertAdmin(context as any);
      const { supabase } = context;

      const [{ data: states }, { data: emails }] = await Promise.all([
        supabase
          .from("dunning_state")
          .select(
            "stripe_subscription_id, user_id, email, price_id, amount_due, failed_at, grace_until, last_stage, resolved_at, blocked_at, environment",
          )
          .order("failed_at", { ascending: false })
          .limit(100),
        supabase
          .from("dunning_emails")
          .select("id, stripe_subscription_id, stage, email, status, error, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      return {
        states: (states ?? []) as unknown as DunningRow[],
        emails: (emails ?? []) as unknown as DunningEmailRow[],
      };
    },
  );

/** Executa a régua de cobrança manualmente a partir do admin. */
export const runDunningNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ checked: number; emails: number; blocked: number } | { error: string }> => {
      await assertAdmin(context as any);
      try {
        const { runDunningSweep } = await import("@/lib/dunning.server");
        return await runDunningSweep();
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
  );
