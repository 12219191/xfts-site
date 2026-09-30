import { createFileRoute } from "@tanstack/react-router";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import { getFlexusApp, type FlexusAppKey } from "@/lib/flexus-apps";

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
 * Checagem central `can("capability.key")` para os sistemas FLEXUS.
 * Retorna 403 quando negado — o bloqueio nunca depende só da tela.
 * Escopos internos da XFTS não podem ser solicitados por sistemas externos.
 */
export const Route = createFileRoute("/api/public/capability-check")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: {
          app?: string;
          user_id?: string;
          capability?: string;
          acting_as?: string;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        const appParam = body.app ?? "";
        const userId = body.user_id ?? "";
        const capabilityKey = body.capability ?? "";
        const providedKey = request.headers.get("x-flexus-app-key") ?? "";

        const startedAt = Date.now();
        const { logIntegrationEvent } = await import("@/lib/integration-log.server");
        const log = async (
          status: "ok" | "denied" | "error",
          httpStatus: number,
          reason?: string,
        ) =>
          logIntegrationEvent({
            appKey: appParam,
            kind: "capability_check",
            status,
            httpStatus,
            reason: reason ?? null,
            userId: UUID_RE.test(userId) ? userId : null,
            durationMs: Date.now() - startedAt,
          });

        const app = getFlexusApp(appParam);
        if (!app) {
          await log("denied", 400, "sistema inválido");
          return json({ error: "Sistema inválido" }, 400);
        }
        if (!UUID_RE.test(userId)) {
          await log("denied", 400, "user_id inválido");
          return json({ error: "user_id inválido" }, 400);
        }
        if (!capabilityKey) {
          await log("denied", 400, "capability ausente");
          return json({ error: "capability é obrigatória" }, 400);
        }

        const expectedKey = appApiKey(app.key as FlexusAppKey);
        if (!providedKey || !expectedKey || !safeEqual(providedKey, expectedKey)) {
          await log("error", 401, "chave de API inválida");
          return json({ error: "Chave de API inválida" }, 401);
        }

        // acting_as: enum validado e usado como TETO; o hub nunca eleva o papel
        // (limite de confiança documentado em capability-check.ts).
        const { parseActingAs, effectiveViewer } = await import("@/lib/capability-check");
        const claim = parseActingAs(body.acting_as);
        if (!claim.ok) {
          await log("denied", claim.status, claim.error);
          return json({ allowed: false, reason: claim.error }, claim.status);
        }

        const { resolveUserEntitlements } = await import("@/lib/entitlements.server");
        const { canCapability } = await import("@/lib/capabilities.server");

        const entitlements = await resolveUserEntitlements(userId, app.key);
        const viewer = effectiveViewer(entitlements.ativo, claim.value);
        if (!viewer) {
          await log("ok", 403, "assinatura inativa");
          return json(
            { allowed: false, reason: "Assinatura inativa para este sistema." },
            403,
          );
        }

        const allowed = await canCapability({
          productKey: app.key,
          capabilityKey,
          entitlements,
          viewer,
        });

        await log("ok", allowed ? 200 : 403, allowed ? undefined : "capability bloqueada");

        return json(
          {
            allowed,
            reason: allowed ? null : "Recurso não liberado para o plano ou perfil do usuário.",
          },
          allowed ? 200 : 403,
        );
      },
    },
  },
});
