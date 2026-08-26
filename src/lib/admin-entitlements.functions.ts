import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EntitlementDefinition } from "@/lib/entitlements";

export interface EntitlementDefinitionInput {
  id?: string;
  productKey: string;
  key: string;
  label: string;
  kind: "feature" | "limit";
  unit: string;
  description: string;
  sortOrder: number;
}

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

/** Todas as definições de recursos e limites, para o Control Center. */
export const getEntitlementDefinitions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EntitlementDefinition[]> => {
    await guard(context);
    const { loadDefinitions } = await import("@/lib/entitlements.server");
    return loadDefinitions();
  });

/** Cria ou atualiza uma definição de recurso/limite de um produto. */
export const saveEntitlementDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: EntitlementDefinitionInput) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const row = {
      product_key: data.productKey,
      key: data.key.trim(),
      label: data.label.trim(),
      kind: data.kind,
      unit: data.unit,
      description: data.description,
      sort_order: data.sortOrder,
    };

    const { error } = await supabaseAdmin
      .from("entitlement_definitions")
      .upsert(row as never, { onConflict: "product_key,key" });
    if (error) throw new Error(error.message);

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: data.id ? "entitlement.definition.update" : "entitlement.definition.create",
      targetType: "entitlement_definition",
      targetId: `${data.productKey}:${row.key}`,
      after: row,
    });
    return { ok: true };
  });

/** Remove uma definição (não altera os planos já salvos). */
export const deleteEntitlementDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const email = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/admin-audit.server");

    const { data: before } = await supabaseAdmin
      .from("entitlement_definitions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("entitlement_definitions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await recordAudit({
      actorId: context.userId,
      actorEmail: email,
      action: "entitlement.definition.delete",
      targetType: "entitlement_definition",
      targetId: data.id,
      before: before ?? null,
    });
    return { ok: true };
  });
