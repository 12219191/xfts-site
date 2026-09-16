import { createFileRoute } from "@tanstack/react-router";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import { getFlexusApp, type FlexusAppKey } from "@/lib/flexus-apps";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-app-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

/**
 * Mapa telas -> capability de um sistema FLEXUS (resources do tipo UI_ROUTE).
 * O SaaS usa isto para bloquear as telas reais sem hardcode de plano.
 */
export const Route = createFileRoute("/api/public/capability-routes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const appParam = url.searchParams.get("app") ?? "";
        const app = getFlexusApp(appParam);
        if (!app) return json({ error: "Sistema inválido" }, 400);

        const providedKey = request.headers.get("x-flexus-app-key") ?? "";
        const expectedKey = appApiKey(app.key as FlexusAppKey);
        if (!providedKey || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          return json({ error: "Chave de API inválida" }, 401);
        }

        const { loadCapabilities } = await import("@/lib/capabilities.server");
        const caps = await loadCapabilities(app.key);

        const routes: Record<string, string> = {};
        const actions: Record<string, string> = {};
        for (const cap of caps) {
          if (!cap.enabled) continue;
          for (const res of cap.resources) {
            if (res.resourceType === "UI_ROUTE") routes[res.resourceKey] = cap.key;
            else actions[`${res.resourceType}:${res.resourceKey}`] = cap.key;
          }
        }

        return json({ app: app.key, routes, actions });
      },
    },
  },
});
