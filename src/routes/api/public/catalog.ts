import { createFileRoute } from "@tanstack/react-router";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import { FLEXUS_APPS } from "@/lib/flexus-apps";
import { canPurchase, statusLabel } from "@/lib/catalog";
import type { CatalogPlan, CatalogProduct } from "@/lib/catalog";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-app-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200, cache = "no-store") {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": cache } });
}

/** Qual sistema apresentou a chave (qualquer app key válida é aceita). */
function callerFromKey(providedKey: string): string | null {
  if (!providedKey) return null;
  for (const app of FLEXUS_APPS) {
    const expected = appApiKey(app.key);
    if (expected && safeEqual(providedKey, expected)) return app.key;
  }
  return null;
}

function planPayload(plan: CatalogPlan) {
  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    description: plan.description,
    price_month_cents: plan.priceMonthCents,
    price_year_cents: plan.priceYearCents,
    currency: "BRL",
    features: plan.features,
    seats: plan.seats,
    trial_days: plan.trialDays,
    entitlements: plan.entitlements,
    price_lookup_key: plan.priceLookupKey,
    annual_lookup_key: plan.annualLookupKey,
    sort_order: plan.sortOrder,
  };
}

function pricing(plans: CatalogPlan[], product: CatalogProduct) {
  const monthly = plans.map((p) => p.priceMonthCents).filter((c) => c > 0);
  const yearly = plans
    .map((p) => p.priceYearCents)
    .filter((c): c is number => typeof c === "number" && c > 0);
  return {
    currency: "BRL",
    price_prefix: product.pricePrefix,
    from_month_cents: monthly.length > 0 ? Math.min(...monthly) : null,
    from_year_cents: yearly.length > 0 ? Math.min(...yearly) : null,
    purchasable: canPurchase(product),
  };
}

/**
 * Catálogo oficial (produtos + planos ativos) para consumo servidor→servidor
 * pelos sistemas FLEXUS. Somente leitura, dados vindos do catálogo real.
 */
export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const startedAt = Date.now();
        const url = new URL(request.url);
        const appParam = (url.searchParams.get("app") ?? "").trim().toLowerCase();
        const providedKey = request.headers.get("x-flexus-app-key") ?? "";

        const { logIntegrationEvent } = await import("@/lib/integration-log.server");

        if (!providedKey) {
          await logIntegrationEvent({
            appKey: appParam,
            kind: "catalog",
            status: "error",
            httpStatus: 401,
            reason: "chave de API ausente",
            durationMs: Date.now() - startedAt,
          });
          return json({ error: "Chave de API ausente" }, 401);
        }

        const caller = callerFromKey(providedKey);
        if (!caller) {
          await logIntegrationEvent({
            appKey: appParam,
            kind: "catalog",
            status: "error",
            httpStatus: 401,
            reason: "chave de API inválida",
            durationMs: Date.now() - startedAt,
          });
          return json({ error: "Chave de API inválida" }, 401);
        }

        const { loadPublicCatalog } = await import("@/lib/catalog.server");
        const snapshot = await loadPublicCatalog();

        const products = snapshot.products
          .filter((p) => !appParam || p.key === appParam)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((product) => {
            const plans = snapshot.plans
              .filter((p) => p.productKey === product.key && p.active)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            return {
              key: product.key,
              name: product.displayName || product.name,
              legal_name: product.name,
              status: product.status,
              status_label: statusLabel(product.status),
              available_for_purchase: canPurchase(product),
              available_in_hub: product.availableInHub,
              show_on_website: product.showOnWebsite,
              short_description: product.shortDescription,
              landing: product.landing,
              url: product.url,
              plans: plans.map(planPayload),
              // Features reais: união dos recursos declarados nos planos ativos.
              features: Array.from(new Set(plans.flatMap((p) => p.features))),
              addons: [],
              pricing: pricing(plans, product),
            };
          });

        await logIntegrationEvent({
          appKey: appParam || caller,
          kind: "catalog",
          status: "ok",
          httpStatus: 200,
          durationMs: Date.now() - startedAt,
          detail: { caller, products: products.length, fallback: snapshot.fallback },
        });

        return json(
          {
            products,
            generated_at: new Date().toISOString(),
            source: snapshot.fallback ? "fallback" : "database",
          },
          200,
          "public, max-age=60",
        );
      },
    },
  },
});
