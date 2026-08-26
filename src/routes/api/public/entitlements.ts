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

        const startedAt = Date.now();
        const { logIntegrationEvent } = await import("@/lib/integration-log.server");
        const log = async (
          status: "ok" | "denied" | "error",
          httpStatus: number,
          reason?: string,
        ) => {
          await logIntegrationEvent({
            appKey: appParam,
            kind: "entitlements",
            status,
            httpStatus,
            reason: reason ?? null,
            userId: UUID_RE.test(userId) ? userId : null,
            durationMs: Date.now() - startedAt,
          });
        };

        const app = getFlexusApp(appParam);
        if (!app) {
          await log("denied", 400, "sistema inválido");
          return json({ error: "Sistema inválido" }, 400);
        }
        if (!UUID_RE.test(userId)) {
          await log("denied", 400, "user_id inválido");
          return json({ error: "user_id inválido" }, 400);
        }

        const expectedKey = appApiKey(app.key as FlexusAppKey);
        if (!providedKey || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          await log("error", 401, "chave de API inválida");
          return json({ error: "Chave de API inválida" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("price_id, status, current_period_end, cancel_at_period_end, seats_used, seats_override")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        const { resolveEntitlements } = await import("@/lib/entitlements.server");

        const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
        if (!sub) {
          await log("ok", 200, "sem assinatura");
          return json({
            ativo: false,
            status: "none",
            plano: null,
            papel: "owner",
            limite_usuarios: 0,
            usuarios_em_uso: 0,
            recursos: {},
            limites: {},
          });
        }

        const periodOk =
          !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
        const ativo =
          periodOk && (ACTIVE_STATUSES.includes(sub.status) || sub.status === "canceled");

        const ent = await resolveEntitlements({
          priceId: sub.price_id,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          seatsOverride: (sub as { seats_override?: number | null }).seats_override ?? null,
        });

        return json({
          ativo,
          status: sub.status,
          plano: planTierFromPriceId(sub.price_id),
          papel: "owner",
          limite_usuarios: ativo
            ? (ent.limites["usuarios"] ?? seatsFromPriceId(sub.price_id))
            : 0,
          recursos: ent.features,
          limites: ent.limites,
          usuarios_em_uso: sub.seats_used ?? 0,
          acesso_ate: sub.current_period_end,
          cancelamento_agendado: sub.cancel_at_period_end ?? false,
        });

      },
    },
  },
});
