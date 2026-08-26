import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CatalogPlan, CatalogProduct } from "@/lib/catalog";
import type { PriceCheck } from "@/lib/catalog-stripe.server";
import type { EntitlementMap } from "@/lib/entitlements";

export interface AdminCatalog {
  products: CatalogProduct[];
  plans: CatalogPlan[];
}

export interface CatalogPlanInput {
  id?: string;
  productKey: string;
  name: string;
  tier: "basico" | "pro" | "enterprise";
  description: string;
  priceMonthCents: number;
  priceYearCents: number | null;
  features: string[];
  seats: number | null;
  ctaLabel: string;
  priceLookupKey: string | null;
  annualLookupKey: string | null;
  active: boolean;
  sortOrder: number;
  trialDays: number;
  entitlements: EntitlementMap;
  /** Cria/atualiza os preços no provedor de pagamento ao salvar. */
  syncStripe: boolean;
  environment: "sandbox" | "live";
}

export interface CatalogProductInput {
  key: string;
  name: string;
  url: string;
  landing: string;
  pricePrefix: string;
  available: boolean;
  sortOrder: number;
}

/** Catálogo completo (inclusive planos inativos) para o Control Center. */
export const getAdminCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCatalog> => {
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    await requireAdminModule(
      context.supabase,
      context.userId,
      (context.claims as { email?: string })?.email ?? "",
      "produtos",
    );
    const { mapPlan, mapProduct } = await import("@/lib/catalog.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [products, plans] = await Promise.all([
      supabaseAdmin.from("catalog_products").select("*").order("sort_order"),
      supabaseAdmin.from("catalog_plans").select("*").order("sort_order"),
    ]);
    if (products.error) throw new Error(products.error.message);
    if (plans.error) throw new Error(plans.error.message);

    return {
      products: (products.data ?? []).map((row) => mapProduct(row as never)),
      plans: (plans.data ?? []).map((row) => mapPlan(row as never)),
    };
  });

/** Cria ou atualiza um produto do catálogo. */
export const saveCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CatalogProductInput) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    await requireAdminModule(context.supabase, context.userId, email, "produtos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const { data: before } = await supabaseAdmin
      .from("catalog_products")
      .select("*")
      .eq("key", data.key)
      .maybeSingle();

    const row = {
      key: data.key,
      name: data.name,
      url: data.url,
      landing: data.landing,
      price_prefix: data.pricePrefix,
      available: data.available,
      sort_order: data.sortOrder,
    };
    const { error } = await supabaseAdmin
      .from("catalog_products")
      .upsert(row as never, { onConflict: "key" });
    if (error) throw new Error(error.message);

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: before ? "catalog.product.update" : "catalog.product.create",
      targetType: "catalog_product",
      targetId: data.key,
      before: before ?? null,
      after: row,
    });
    return { ok: true };
  });

/** Cria ou atualiza um plano, sincronizando os preços no provedor. */
export const saveCatalogPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CatalogPlanInput) => data)
  .handler(async ({ data, context }): Promise<{ ok: true; synced: string[] }> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    await requireAdminModule(context.supabase, context.userId, email, "produtos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const { data: before } = data.id
      ? await supabaseAdmin.from("catalog_plans").select("*").eq("id", data.id).maybeSingle()
      : { data: null };

    const { data: product } = await supabaseAdmin
      .from("catalog_products")
      .select("name")
      .eq("key", data.productKey)
      .maybeSingle();
    const productName = (product as { name?: string } | null)?.name ?? data.productKey;

    // Stripe primeiro: se falhar, o banco não é alterado.
    const synced: string[] = [];
    if (data.syncStripe) {
      const { syncPrice } = await import("@/lib/catalog-stripe.server");
      if (data.priceLookupKey) {
        const result = await syncPrice({
          environment: data.environment,
          lookupKey: data.priceLookupKey,
          productName: `${productName} — ${data.name}`,
          amountCents: data.priceMonthCents,
          interval: "month",
        });
        if (result.created) synced.push(result.lookupKey);
      }
      if (data.annualLookupKey && data.priceYearCents) {
        const result = await syncPrice({
          environment: data.environment,
          lookupKey: data.annualLookupKey,
          productName: `${productName} — ${data.name} (anual)`,
          amountCents: data.priceYearCents,
          interval: "year",
        });
        if (result.created) synced.push(result.lookupKey);
      }
    }

    const row = {
      product_key: data.productKey,
      name: data.name,
      tier: data.tier,
      description: data.description,
      price_month_cents: data.priceMonthCents,
      price_year_cents: data.priceYearCents,
      features: data.features,
      seats: data.seats,
      cta_label: data.ctaLabel,
      price_lookup_key: data.priceLookupKey,
      annual_lookup_key: data.annualLookupKey,
      active: data.active,
      sort_order: data.sortOrder,
      trial_days: Math.max(0, Math.min(90, Math.round(data.trialDays || 0))),
      entitlements: data.entitlements ?? {},
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("catalog_plans")
        .update(row as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("catalog_plans").insert(row as never);
      if (error) throw new Error(error.message);
    }

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: data.id ? "catalog.plan.update" : "catalog.plan.create",
      targetType: "catalog_plan",
      targetId: data.id ?? `${data.productKey}:${data.name}`,
      before: before ?? null,
      after: { ...row, stripe_synced: synced },
    });

    return { ok: true, synced };
  });

/** Remove um plano do catálogo. */
export const deleteCatalogPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    await requireAdminModule(context.supabase, context.userId, email, "produtos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const { data: before } = await supabaseAdmin
      .from("catalog_plans")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("catalog_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "catalog.plan.delete",
      targetType: "catalog_plan",
      targetId: data.id,
      before: before ?? null,
    });
    return { ok: true };
  });

/** Conferência banco × provedor de pagamento. */
export const checkCatalogPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: "sandbox" | "live" }) => data)
  .handler(async ({ data, context }): Promise<PriceCheck[]> => {
    const email = (context.claims as { email?: string })?.email ?? "";
    const { requireAdminModule } = await import("@/lib/admin-rbac.server");
    await requireAdminModule(context.supabase, context.userId, email, "produtos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plans, error } = await supabaseAdmin
      .from("catalog_plans")
      .select("price_lookup_key, annual_lookup_key, price_month_cents, price_year_cents, active")
      .eq("active", true);
    if (error) throw new Error(error.message);

    const entries: Array<{ lookupKey: string; expectedCents: number }> = [];
    for (const raw of plans ?? []) {
      const plan = raw as {
        price_lookup_key: string | null;
        annual_lookup_key: string | null;
        price_month_cents: number;
        price_year_cents: number | null;
      };
      if (plan.price_lookup_key) {
        entries.push({ lookupKey: plan.price_lookup_key, expectedCents: plan.price_month_cents });
      }
      if (plan.annual_lookup_key && plan.price_year_cents) {
        entries.push({ lookupKey: plan.annual_lookup_key, expectedCents: plan.price_year_cents });
      }
    }

    const { checkPrices } = await import("@/lib/catalog-stripe.server");
    return checkPrices(data.environment, entries);
  });
