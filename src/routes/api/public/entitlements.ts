import { createFileRoute } from "@tanstack/react-router";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import {
  ACTIVE_STATUSES,
  appKeyFromPriceId,
  getFlexusApp,
  planTierFromPriceId,
  seatsFromPriceId,
  type FlexusAppKey,
} from "@/lib/flexus-apps";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-app-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Revalidação periódica de acesso: o sistema pergunta ao hub se o usuário
 * continua com assinatura válida daquele produto.
 */
export const Route = createFileRoute("/api/public/entitlements")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const appParam = url.searchParams.get("app") ?? "";
        const userId = url.searchParams.get("user_id") ?? "";
        const providedKey = request.headers.get("x-flexus-app-key") ?? "";

        const app = getFlexusApp(appParam);
        if (!app) return json({ error: "Sistema inválido" }, 400);
        if (!UUID_RE.test(userId)) return json({ error: "user_id inválido" }, 400);

        const expectedKey = appApiKey(app.key as FlexusAppKey);
        if (!providedKey || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          return json({ error: "Chave de API inválida" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("price_id, status, current_period_end, cancel_at_period_end, seats_used")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
        if (!sub)
          return json({
            ativo: false,
            status: "none",
            plano: null,
            papel: "owner",
            limite_usuarios: 0,
            usuarios_em_uso: 0,
          });

        const periodOk =
          !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
        const ativo =
          periodOk && (ACTIVE_STATUSES.includes(sub.status) || sub.status === "canceled");

        return json({
          ativo,
          status: sub.status,
          plano: planTierFromPriceId(sub.price_id),
          papel: "owner",
          limite_usuarios: ativo ? seatsFromPriceId(sub.price_id) : 0,
          usuarios_em_uso: sub.seats_used ?? 0,
          acesso_ate: sub.current_period_end,
          cancelamento_agendado: sub.cancel_at_period_end ?? false,
        });

      },
    },
  },
});
