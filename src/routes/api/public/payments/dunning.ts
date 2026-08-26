import { createFileRoute } from "@tanstack/react-router";

/**
 * Executa a régua de cobrança (e-mails D+1/D+3/D+5 e bloqueio ao fim da carência).
 *
 * Autenticação aceita:
 * - `x-cron-key`: chave do agendamento automático (validada no banco);
 * - `x-flexus-key`: segredo compartilhado, para disparo manual/administrativo.
 */
export const Route = createFileRoute("/api/public/payments/dunning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = () =>
          new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });

        const cronKey = request.headers.get("x-cron-key") ?? "";
        const flexusKey = request.headers.get("x-flexus-key") ?? "";

        let authorized = false;

        if (cronKey) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin.rpc("verify_cron_key", {
            _name: "dunning",
            _value: cronKey,
          });
          authorized = data === true;
        }

        if (!authorized && flexusKey) {
          const secret = process.env["FLEXUS_SSO_SECRET"];
          const { safeEqual } = await import("@/lib/sso.server");
          authorized = Boolean(secret) && safeEqual(flexusKey, secret!);
        }

        if (!authorized) return unauthorized();

        const { recordCronRun } = await import("@/lib/cron-monitor.server");
        const run = await recordCronRun("dunning", async () => {
          const { runDunningSweep } = await import("@/lib/dunning.server");
          const { expireCourtesyAccess } = await import("@/lib/courtesy.server");
          const { runTrialReminders } = await import("@/lib/onboarding.server");
          const result = await runDunningSweep();
          const courtesy = await expireCourtesyAccess();
          const trials = await runTrialReminders();
          return { ...result, courtesy, trials };
        });

        if (!run.ok) return Response.json({ error: run.error }, { status: 500 });
        return Response.json(run.result);

      },
    },
  },
});

