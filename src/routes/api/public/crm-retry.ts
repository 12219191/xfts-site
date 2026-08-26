import { createFileRoute } from "@tanstack/react-router";

/**
 * Reprocessa os leads pendentes de envio ao CRM.
 *
 * Autenticação aceita:
 * - `x-cron-key`: chave do agendamento automático (validada no banco);
 * - `x-flexus-key`: chave do FLEXUS | CRM, para disparo manual.
 */
export const Route = createFileRoute("/api/public/crm-retry")({
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
            _name: "crm-retry",
            _value: cronKey,
          });
          authorized = data === true;
        }

        if (!authorized && flexusKey) {
          const key = process.env["FLEXUS_APP_KEY_CRM"];
          const { safeEqual } = await import("@/lib/sso.server");
          authorized = Boolean(key) && safeEqual(flexusKey, key!);
        }

        if (!authorized) return unauthorized();


        const { recordCronRun } = await import("@/lib/cron-monitor.server");
        const run = await recordCronRun("crm-retry", async () => {
          const { retryPendingCrmLeads } = await import("@/lib/crm-lead.server");
          return retryPendingCrmLeads(25);
        });

        if (!run.ok) return Response.json({ error: run.error }, { status: 500 });
        return Response.json(run.result);

      },
    },
  },
});
