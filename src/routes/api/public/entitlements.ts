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

export const CREDITS_BUILD = "credits-cycle-r3";

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { ...CORS, "Cache-Control": "no-store", "X-XFTS-Credits-Build": CREDITS_BUILD },
  });
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

        // Nada é gravado antes de a chave do sistema ser verificada.
        const app = getFlexusApp(appParam);
        if (!app) return json({ error: "Sistema inválido" }, 400);

        const expectedKey = appApiKey(app.key as FlexusAppKey);
        if (!providedKey || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          return json({ error: "Chave de API inválida" }, 401);
        }

        if (!UUID_RE.test(userId)) {
          await log("denied", 400, "user_id inválido");
          return json({ error: "user_id inválido" }, 400);
        }

        // Sessão de Suporte XFTS (opcional): amarrada a este app e a este tenant.
        const supportSessionId = url.searchParams.get("support_session_id");
        let support: { role: import("@/lib/support-session").SupportRole; id: string } | null = null;
        if (supportSessionId !== null) {
          const { bindSession } = await import("@/lib/support-session.server");
          const bound = await bindSession(supportSessionId, providedKey, userId);
          if (!bound.ok || bound.app !== app.key) {
            const status = bound.ok ? 403 : bound.status;
            const error = bound.ok ? "Sessão de suporte não pertence a este sistema" : bound.error;
            await log("denied", status, error);
            return json({ error }, status);
          }
          support = { role: bound.row.role, id: bound.row.id };
        }
        const { supportViewer, isWriteAllowed } = await import("@/lib/support-session");
        const viewer = support
          ? supportViewer(support.role)
          : ({ actingAs: "TENANT_ADMIN" } as const);
        const withSupport = (payload: Record<string, unknown>) =>
          support
            ? {
                ...payload,
                support: {
                  session_id: support.id,
                  role: support.role,
                  can_write: isWriteAllowed(support.role),
                },
              }
            : payload;

        if (app.key === "atende") {
          const { resolveUserEntitlements, creditCycleForSub } = await import("@/lib/entitlements.server");
          const ent = await resolveUserEntitlements(userId, "atende");
          // Mesma assinatura canônica para acesso e credit_cycle (sem re-resolver).
          const s = ent.ativo ? (ent.atendeSub ?? null) : null;
          const { resolveCapabilities } = await import("@/lib/capabilities.server");
          const capabilities = s
            ? await resolveCapabilities({ productKey: "atende", entitlements: ent, viewer })
            : [];
          await log("ok", 200, ent.denialReason);
          const { buildAtendeEntitlementsPayload } = await import("@/lib/atende-entitlements-payload");
          const cycle = await creditCycleForSub(s);
          return json(withSupport(buildAtendeEntitlementsPayload(ent, s, capabilities, cycle) as Record<string, unknown>));
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("price_id, status, current_period_start, current_period_end, cancel_at_period_end, seats_used, seats_override, environment")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        const { resolveEntitlements } = await import("@/lib/entitlements.server");

        const flow = await import("@/lib/flow-sub");
        const isFlow = app.key === "flow";
        const sub = isFlow
          ? flow.pickFlowSub(subs ?? [], (p) => appKeyFromPriceId(p) === "flow")
          : (subs ?? []).find((s) => appKeyFromPriceId(s.price_id) === app.key);
        const flowExtra = isFlow
          ? { environment: flow.flowEnvironment(sub ?? null), ...flow.flowPeriodFields(sub ?? null) }
          : {};
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
            capabilities: [],
            ...flowExtra,
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

        // Aditivo: capabilities liberadas (o formato antigo segue igual).
        const { resolveCapabilities } = await import("@/lib/capabilities.server");
        const capabilities = ativo
          ? await resolveCapabilities({
              productKey: app.key,
              entitlements: ent,
              viewer,
            })
          : [];

        await log("ok", 200, ativo ? undefined : "assinatura inativa");

        return json(withSupport({
          ativo,
          status: sub.status,
          plano: planTierFromPriceId(sub.price_id),
          papel: "owner",
          limite_usuarios: ativo
            ? (ent.limites["usuarios"] ?? seatsFromPriceId(sub.price_id))
            : 0,
          recursos: ent.features,
          limites: ent.limites,
          capabilities,
          usuarios_em_uso: sub.seats_used ?? 0,
          acesso_ate: sub.current_period_end,
          cancelamento_agendado: sub.cancel_at_period_end ?? false,
          ...flowExtra,
        }));

      },
    },
  },
});
