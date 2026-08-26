import { createFileRoute } from "@tanstack/react-router";

/**
 * Status objetivo do sistema para monitoramento externo.
 *
 * Sem a chave de monitoramento (`x-cron-key` da rotina `health`) devolve apenas
 * "ok"/"degradado"; com a chave, devolve os números por área.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const provided = request.headers.get("x-cron-key") ?? "";

        let detailed = false;
        if (provided) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin.rpc("verify_cron_key", {
            _name: "health",
            _value: provided,
          });
          detailed = data === true;
        }

        try {
          const { buildOperationalAlerts } = await import("@/lib/reliability.server");
          const alerts = await buildOperationalAlerts();

          const problemas =
            alerts.webhooksFalhos24h +
            alerts.provisionamentosEsgotados +
            alerts.emailsPresos +
            alerts.emailsEsgotados +
            alerts.sistemasComProblema.length +
            alerts.rotinasAtrasadas.length +
            alerts.rotinasComFalha.length;

          const status = problemas === 0 ? "ok" : "degradado";
          const body = detailed
            ? { status, verificadoEm: new Date().toISOString(), detalhes: alerts }
            : { status, verificadoEm: new Date().toISOString() };

          return new Response(JSON.stringify(body), {
            status: status === "ok" ? 200 : 503,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({
              status: "falha",
              erro: e instanceof Error ? e.message : "erro desconhecido",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            },
          );
        }
      },
    },
  },
});
