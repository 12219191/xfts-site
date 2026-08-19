import { createFileRoute } from "@tanstack/react-router";

/**
 * Reprocessa os leads pendentes de envio ao CRM.
 * Chamado por agendamento (pg_cron) com o header `x-flexus-key`.
 */
export const Route = createFileRoute("/api/public/crm-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["FLEXUS_APP_KEY_CRM"];
        const provided = request.headers.get("x-flexus-key") ?? "";
        const { safeEqual } = await import("@/lib/sso.server");
        if (!key || !provided || !safeEqual(provided, key)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { retryPendingCrmLeads } = await import("@/lib/crm-lead.server");
        const result = await retryPendingCrmLeads(25);
        return Response.json(result);
      },
    },
  },
});
