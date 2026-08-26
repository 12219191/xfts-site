import { createFileRoute } from "@tanstack/react-router";

/**
 * Processa a fila de e-mails (pg_cron, a cada 5 minutos): tenta novamente os
 * envios que falharam, respeitando a espera crescente entre tentativas.
 */
export const Route = createFileRoute("/api/public/email-queue-flush")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-key") ?? "";
        if (!provided) return Response.json({ error: "unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: valid } = await supabaseAdmin.rpc("verify_cron_key", {
          _name: "email-queue",
          _value: provided,
        });
        if (!valid) return Response.json({ error: "unauthorized" }, { status: 401 });

        const { recordCronRun } = await import("@/lib/cron-monitor.server");
        const { flushEmailQueue } = await import("@/lib/email-queue.server");

        const run = await recordCronRun("email-queue", () => flushEmailQueue(25));
        if (!run.ok) return Response.json({ error: run.error }, { status: 500 });
        return Response.json(run.result);
      },
    },
  },
});
