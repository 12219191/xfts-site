import { createFileRoute } from "@tanstack/react-router";
import { SUPPORT_CORS, readJson, str, supportJson } from "@/lib/support-session-http";

/**
 * O produto registra cada escrita antes de concluí-la.
 * XFTS_SUPPORT (somente leitura) recebe 403 e a tentativa fica auditada.
 */
export const Route = createFileRoute("/api/public/support-session/audit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: SUPPORT_CORS }),
      POST: async ({ request }) => {
        const body = await readJson(request);
        const sid = str(body?.["session_id"], 64);
        const tenant = str(body?.["tenant_id"], 64);
        const action = str(body?.["action"], 120);
        if (!sid || !tenant || !action) return supportJson({ error: "Payload inválido" }, 400);
        const detail = body?.["detail"];
        const safeDetail =
          detail && JSON.stringify(detail).length <= 4000 ? detail : null;
        const { recordWrite } = await import("@/lib/support-session.server");
        const r = await recordWrite(sid, request.headers.get("x-flexus-app-key") ?? "", tenant, {
          action,
          resource: str(body?.["resource"], 200) || null,
          detail: safeDetail,
        });
        return supportJson(r.body, r.status);
      },
    },
  },
});
