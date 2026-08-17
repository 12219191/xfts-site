import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appApiKey, safeEqual, verifySsoToken } from "@/lib/sso.server";
import {
  ACTIVE_STATUSES,
  appKeyFromPriceId,
  getFlexusApp,
  seatsFromPriceId,
} from "@/lib/flexus-apps";

const bodySchema = z.object({
  token: z.string().min(20).max(4000),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-app-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

/**
 * O sistema (xfts-flexus6/7/8) troca o token de SSO pelos dados do usuário.
 * Autenticado pela chave de API do próprio sistema.
 */
export const Route = createFileRoute("/api/public/sso/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const providedKey = request.headers.get("x-flexus-app-key") ?? "";
        if (!providedKey) return json({ error: "Chave de API ausente" }, 401);

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "Payload inválido" }, 400);
        }

        const payload = await verifySsoToken(parsed.token);
        if (!payload) return json({ error: "Token inválido ou expirado" }, 401);

        const app = getFlexusApp(payload.app);
        const expectedKey = appApiKey(payload.app);
        if (!app || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          return json({ error: "Chave de API inválida para este sistema" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Uso único: só consome se ainda não foi usado e não expirou.
        const { data: consumed } = await supabaseAdmin
          .from("sso_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("jti", payload.jti)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .select("id")
          .maybeSingle();

        if (!consumed) return json({ error: "Token já utilizado ou expirado" }, 401);

        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("price_id, status, current_period_end, cancel_at_period_end, environment")
          .eq("user_id", payload.sub)
          .order("created_at", { ascending: false });

        const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
        const periodOk =
          !sub?.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
        const active = !!sub && periodOk &&
          (ACTIVE_STATUSES.includes(sub.status) || sub.status === "canceled");

        return json({
          user_id: payload.sub,
          email: payload.email,
          produto: app.key,
          plano: payload.plan,
          papel: payload.role ?? "owner",
          limite_usuarios: payload.seats ?? seatsFromPriceId(sub?.price_id),
          status: sub?.status ?? "none",
          ativo: active,
          acesso_ate: sub?.current_period_end ?? null,
          cancelamento_agendado: sub?.cancel_at_period_end ?? false,
        });
      },
    },
  },
});
