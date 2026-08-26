import { createFileRoute } from "@tanstack/react-router";

/**
 * Sweep de confiabilidade (pg_cron, a cada 5 minutos):
 * reenvia avisos pendentes aos sistemas FLEXUS, limpa links expirados e
 * dispara o resumo diário de alertas para a equipe interna.
 */
export const Route = createFileRoute("/api/public/provision-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-key") ?? "";
        if (!provided) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: valid } = await supabaseAdmin.rpc("verify_cron_key", {
          _name: "reliability",
          _value: provided,
        });
        if (!valid) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const { retryProvisionQueue, cleanupExpiredSsoTokens, sendDailyOperationalDigest } =
          await import("@/lib/reliability.server");

        const fila = await retryProvisionQueue(25);
        const tokensRemovidos = await cleanupExpiredSsoTokens();
        const digest = await sendDailyOperationalDigest();

        return Response.json({ fila, tokensRemovidos, digest });
      },
    },
  },
});
