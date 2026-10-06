import { createFileRoute } from "@tanstack/react-router";
import { SUPPORT_CORS, readJson, str, supportJson } from "@/lib/support-session-http";

/** Revalidação periódica da sessão de suporte pelo produto. */
export const Route = createFileRoute("/api/public/support-session/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: SUPPORT_CORS }),
      POST: async ({ request }) => {
        const body = await readJson(request);
        const sid = str(body?.["session_id"], 64);
        const tenant = str(body?.["tenant_id"], 64);
        if (!sid || !tenant) return supportJson({ error: "Payload inválido" }, 400);
        const { sessionStatus } = await import("@/lib/support-session.server");
        const r = await sessionStatus(sid, request.headers.get("x-flexus-app-key") ?? "", tenant);
        return supportJson(r.body, r.status);
      },
    },
  },
});
