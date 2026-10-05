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
        const startedAt = Date.now();
        const { logIntegrationEvent } = await import("@/lib/integration-log.server");
        const log = async (
          appKey: string,
          status: "ok" | "denied" | "error",
          httpStatus: number,
          reason?: string,
          userId?: string | null,
        ) => {
          await logIntegrationEvent({
            appKey,
            kind: "sso_verify",
            status,
            httpStatus,
            reason: reason ?? null,
            userId: userId ?? null,
            durationMs: Date.now() - startedAt,
          });
        };

        const providedKey = request.headers.get("x-flexus-app-key") ?? "";
        if (!providedKey) {
          await log("", "denied", 401, "chave de API ausente");
          return json({ error: "Chave de API ausente" }, 401);
        }

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          await log("", "denied", 400, "payload inválido");
          return json({ error: "Payload inválido" }, 400);
        }

        const payload = await verifySsoToken(parsed.token);
        if (!payload) {
          await log("", "denied", 401, "token inválido ou expirado");
          return json({ error: "Token inválido ou expirado" }, 401);
        }

        const app = getFlexusApp(payload.app);
        const expectedKey = appApiKey(payload.app);
        if (!app || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          await log(payload.app, "error", 401, "chave de API inválida", payload.sub);
          return json({ error: "Chave de API inválida para este sistema" }, 401);
        }

        const isAtende = app.key === "atende";
        const { atendePurposeAllowed, isPaymentEnv } = await import(
          "@/lib/atende-sso"
        );
        if (isAtende) {
          // Atende: só titular (owner/legado) e ambiente assinado obrigatório.
          if (!atendePurposeAllowed(payload.purpose)) {
            await log(app.key, "denied", 403, "purpose não permitido", payload.sub);
            return json({ error: "Tipo de acesso não permitido para este sistema" }, 403);
          }
          if (payload.env !== "live") {
            await log(app.key, "denied", 401, "token sem ambiente", payload.sub);
            return json({ error: "Token inválido ou expirado" }, 401);
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (isAtende) {
          // Recusa tokens de suporte já emitidos, mesmo antes de consumir.
          const { data: row } = await supabaseAdmin
            .from("sso_tokens")
            .select("purpose, app_key")
            .eq("jti", payload.jti)
            .maybeSingle();
          if (!row || row.app_key !== "atende" || !atendePurposeAllowed(payload.purpose, row.purpose)) {
            await log(app.key, "denied", 403, "token não é de titular", payload.sub);
            return json({ error: "Tipo de acesso não permitido para este sistema" }, 403);
          }
        }

        // Uso único: só consome se ainda não foi usado e não expirou.
        const { data: consumed } = await supabaseAdmin
          .from("sso_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("jti", payload.jti)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .select("id")
          .maybeSingle();

        if (!consumed) {
          await log(app.key, "denied", 401, "token já utilizado ou expirado", payload.sub);
          return json({ error: "Token já utilizado ou expirado" }, 401);
        }

        if (isAtende && isPaymentEnv(payload.env)) {
          const { resolveAtendeLive } = await import("@/lib/entitlements.server");
          const r = await resolveAtendeLive(payload.sub);
          if (r.kind === "ambiguous") {
            await log(app.key, "denied", 409, `assinatura ambígua (${r.count})`, payload.sub);
            return json({ error: "Mais de uma assinatura ativa; acesso negado" }, 409);
          }
          if (r.kind === "none") {
            await log(app.key, "denied", 403, "sem assinatura ativa no ambiente", payload.sub);
            return json({ error: "Sem assinatura ativa" }, 403);
          }
          const s = r.sub;
          const { resolveEntitlements } = await import("@/lib/entitlements.server");
          const ent = await resolveEntitlements({
            priceId: s.price_id,
            status: s.status,
            currentPeriodEnd: s.current_period_end,
            seatsOverride: s.seats_override ?? null,
          });
          // Nome do plano vem do catálogo; sem plano cadastrado → null (sem mapear tiers).
          const { data: plan } = await supabaseAdmin
            .from("catalog_plans")
            .select("name")
            .eq("product_key", "atende")
            .or(`price_lookup_key.eq.${s.price_id},annual_lookup_key.eq.${s.price_id}`)
            .maybeSingle();
          const { loadAtendeCreditCycle } = await import("@/lib/entitlements.server");
          const creditCycle = await loadAtendeCreditCycle(payload.sub);
          await log(app.key, "ok", 200, undefined, payload.sub);
          return json({
            user_id: payload.sub,
            email: payload.email,
            produto: "atende",
            plano: plan?.name ?? null,
            papel: "owner",
            purpose: "owner",
            environment: r.environment,
            limite_usuarios: ent.limites["usuarios"] ?? null,
            recursos: ent.features,
            limites: ent.limites,
            status: s.status,
            ativo: true,
            acesso_ate: s.current_period_end ?? null,
            cancelamento_agendado: s.cancel_at_period_end ?? false,
            credit_cycle: creditCycle,
          });
        }

        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select(
            "price_id, status, current_period_end, cancel_at_period_end, environment, seats_override",
          )
          .eq("user_id", payload.sub)
          .order("created_at", { ascending: false });

        const sub = (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
        const periodOk =
          !sub?.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
        const active = !!sub && periodOk &&
          (ACTIVE_STATUSES.includes(sub.status) || sub.status === "canceled");

        const { resolveEntitlements } = await import("@/lib/entitlements.server");
        const ent = await resolveEntitlements({
          priceId: sub?.price_id ?? null,
          status: sub?.status ?? "none",
          currentPeriodEnd: sub?.current_period_end ?? null,
          seatsOverride: (sub as { seats_override?: number | null } | undefined)?.seats_override ?? null,
        });

        await log(
          app.key,
          "ok",
          200,
          active ? undefined : "assinatura inativa",
          payload.sub,
        );

        return json({
          user_id: payload.sub,
          email: payload.email,
          produto: app.key,
          plano: payload.plan,
          papel: payload.role ?? "owner",
          limite_usuarios: active
            ? (ent.limites["usuarios"] ?? payload.seats ?? seatsFromPriceId(sub?.price_id))
            : 0,
          recursos: ent.features,
          limites: ent.limites,
          status: sub?.status ?? "none",
          ativo: active,
          acesso_ate: sub?.current_period_end ?? null,
          cancelamento_agendado: sub?.cancel_at_period_end ?? false,
        });
      },
    },
  },
});
