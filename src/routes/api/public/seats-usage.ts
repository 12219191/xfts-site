import { createFileRoute } from "@tanstack/react-router";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import { appKeyFromPriceId, getFlexusApp, seatsFromPriceId, type FlexusAppKey } from "@/lib/flexus-apps";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-app-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cada sistema FLEXUS reporta ao hub quantos usuários realmente utiliza.
 * O hub guarda o número e devolve o limite do plano, permitindo bloquear
 * novos convites quando o limite for atingido.
 */
export const Route = createFileRoute("/api/public/seats-usage")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const providedKey = request.headers.get("x-flexus-app-key") ?? "";
        let body: { app?: string; user_id?: string; seats_used?: number };
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        const app = getFlexusApp(body.app ?? "");
        if (!app) return json({ error: "Sistema inválido" }, 400);
        if (!UUID_RE.test(body.user_id ?? "")) return json({ error: "user_id inválido" }, 400);

        const seats = Number(body.seats_used);
        if (!Number.isInteger(seats) || seats < 0 || seats > 10000) {
          return json({ error: "seats_used inválido" }, 400);
        }

        const expectedKey = appApiKey(app.key as FlexusAppKey);
        if (!providedKey || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          return json({ error: "Chave de API inválida" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("id, price_id")
          .eq("user_id", body.user_id!)
          .order("created_at", { ascending: false });

        const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
        if (!sub) return json({ error: "Assinatura não encontrada" }, 404);

        await supabaseAdmin
          .from("subscriptions")
          .update({ seats_used: seats, seats_reported_at: new Date().toISOString() })
          .eq("id", sub.id);

        const limite = seatsFromPriceId(sub.price_id);
        return json({
          ok: true,
          seats_used: seats,
          limite_usuarios: limite,
          excedido: limite !== null && seats > limite,
        });
      },
    },
  },
});
