import { createFileRoute } from "@tanstack/react-router";

/**
 * Executa a régua de cobrança (e-mails D+3/D+5 e bloqueio ao fim da carência).
 * Chamado por agendamento externo com o header `x-flexus-key`.
 */
export const Route = createFileRoute("/api/public/payments/dunning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["FLEXUS_SSO_SECRET"];
        const provided = request.headers.get("x-flexus-key") ?? "";
        const { safeEqual } = await import("@/lib/sso.server");
        if (!key || !provided || !safeEqual(provided, key)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { runDunningSweep } = await import("@/lib/dunning.server");
        const result = await runDunningSweep();
        return Response.json(result);
      },
    },
  },
});
