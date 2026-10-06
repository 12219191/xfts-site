import { createFileRoute } from "@tanstack/react-router";
import { SUPPORT_CORS, readJson, str, supportJson } from "@/lib/support-session-http";

/** O produto troca o token de suporte (uso único, 5 min) por uma sessão (máx. 60 min). */
export const Route = createFileRoute("/api/public/support-session/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: SUPPORT_CORS }),
      POST: async ({ request }) => {
        const body = await readJson(request);
        const token = str(body?.["token"], 6000);
        if (!token) return supportJson({ error: "Payload inválido" }, 400);
        const { verifyAndConsume } = await import("@/lib/support-session.server");
        const r = await verifyAndConsume(token, request.headers.get("x-flexus-app-key") ?? "");
        return supportJson(r.body, r.status);
      },
    },
  },
});
