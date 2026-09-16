import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Capability, ResourceType, VisibilityScope } from "@/lib/capabilities";

export interface CapabilityInput {
  id?: string;
  productKey: string;
  key: string;
  name: string;
  description: string;
  category: string;
  requiredEntitlementKey: string | null;
  visibilityScope: VisibilityScope;
  enabled: boolean;
  sortOrder: number;
  resources: Array<{ resourceType: ResourceType; resourceKey: string }>;
}

/** Só o módulo Produtos do Control Center pode administrar capabilities. */
async function guard(context: {
  supabase: unknown;
  userId: string;
  claims: unknown;
}): Promise<string> {
  const email = (context.claims as { email?: string })?.email ?? "";
  const { requireAdminModule } = await import("@/lib/admin-rbac.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await requireAdminModule(context.supabase as any, context.userId, email, "produtos");
  return email;
}

/** Capabilities cadastradas (todas ou de um produto). */
export const getCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { productKey?: string }) => data ?? {})
  .handler(async ({ data, context }): Promise<Capability[]> => {
    await guard(context);
    const { loadCapabilities } = await import("@/lib/capabilities.server");
    return loadCapabilities(data.productKey);
  });

/** Em quais produtos/capabilities cada entitlement é exigido. */
export const getEntitlementUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const { entitlementUsage } = await import("@/lib/capabilities.server");
    return entitlementUsage();
  });

/** Cria ou atualiza uma capability e seus resources. */
export const saveCapability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CapabilityInput) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const key = data.key.trim();
    if (!key || !data.name.trim()) throw new Error("Informe a chave e o nome da capability.");

    const { data: before } = await supabaseAdmin
      .from("product_capabilities")
      .select("*")
      .eq("product_key", data.productKey)
      .eq("key", key)
      .maybeSingle();

    const row = {
      product_key: data.productKey,
      key,
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category.trim() || "geral",
      required_entitlement_key: data.requiredEntitlementKey || null,
      visibility_scope: data.visibilityScope,
      enabled: data.enabled,
      sort_order: data.sortOrder,
    };

    const { data: saved, error } = await supabaseAdmin
      .from("product_capabilities")
      .upsert(row as never, { onConflict: "product_key,key" })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const capabilityId = (saved as { id: string } | null)?.id ?? (before as { id?: string } | null)?.id;
    if (capabilityId) {
      await supabaseAdmin.from("capability_resources").delete().eq("capability_id", capabilityId);
      const resources = data.resources
        .filter((r) => r.resourceKey.trim())
        .map((r) => ({
          capability_id: capabilityId,
          resource_type: r.resourceType,
          resource_key: r.resourceKey.trim(),
        }));
      if (resources.length > 0) {
        const { error: resError } = await supabaseAdmin
          .from("capability_resources")
          .insert(resources as never);
        if (resError) throw new Error(resError.message);
      }
    }

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: before ? "capability.update" : "capability.create",
      targetType: "capability",
      targetId: `${data.productKey}:${key}`,
      before: before ?? null,
      after: { ...row, resources: data.resources },
    });
    return { ok: true };
  });

/** Liga/desliga uma capability sem abrir o formulário. */
export const setCapabilityEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; enabled: boolean }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const { data: before } = await supabaseAdmin
      .from("product_capabilities")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("product_capabilities")
      .update({ enabled: data.enabled } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: data.enabled ? "capability.enable" : "capability.disable",
      targetType: "capability",
      targetId: data.id,
      before: before ?? null,
      after: { enabled: data.enabled },
    });
    return { ok: true };
  });

/** Remove a capability (e seus resources). */
export const deleteCapability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const { data: before } = await supabaseAdmin
      .from("product_capabilities")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("product_capabilities")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "capability.delete",
      targetType: "capability",
      targetId: data.id,
      before: before ?? null,
    });
    return { ok: true };
  });
