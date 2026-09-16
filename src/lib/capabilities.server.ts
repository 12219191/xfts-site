/**
 * Resolução central das capabilities (server-only).
 * ALLOW = capability ativa E entitlement exigido liberado E escopo compatível.
 */
import {
  scopeAllows,
  type Capability,
  type CapabilityResource,
  type CapabilityViewer,
  type ResourceType,
  type VisibilityScope,
} from "@/lib/capabilities";
import { hasFeature, limitOf, type ResolvedEntitlements } from "@/lib/entitlements";

interface CapabilityRow {
  id: string;
  product_key: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  required_entitlement_key: string | null;
  visibility_scope: string;
  enabled: boolean;
  sort_order: number;
}

interface ResourceRow {
  id: string;
  capability_id: string;
  resource_type: string;
  resource_key: string;
}

function mapCapability(row: CapabilityRow, resources: CapabilityResource[]): Capability {
  return {
    id: row.id,
    productKey: row.product_key,
    key: row.key,
    name: row.name,
    description: row.description ?? "",
    category: row.category ?? "geral",
    requiredEntitlementKey: row.required_entitlement_key,
    visibilityScope: row.visibility_scope as VisibilityScope,
    enabled: row.enabled,
    sortOrder: row.sort_order ?? 10,
    resources,
  };
}

/** Capabilities cadastradas (opcionalmente de um produto), já com os resources. */
export async function loadCapabilities(productKey?: string): Promise<Capability[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("product_capabilities")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (productKey) query = query.eq("product_key", productKey);

  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as unknown as CapabilityRow[];
  if (rows.length === 0) return [];

  const { data: resData } = await supabaseAdmin
    .from("capability_resources")
    .select("*")
    .in(
      "capability_id",
      rows.map((r) => r.id),
    );

  const byCapability = new Map<string, CapabilityResource[]>();
  for (const raw of (resData ?? []) as unknown as ResourceRow[]) {
    const list = byCapability.get(raw.capability_id) ?? [];
    list.push({
      id: raw.id,
      capabilityId: raw.capability_id,
      resourceType: raw.resource_type as ResourceType,
      resourceKey: raw.resource_key,
    });
    byCapability.set(raw.capability_id, list);
  }

  return rows.map((row) => mapCapability(row, byCapability.get(row.id) ?? []));
}

/** O entitlement exigido está liberado nos entitlements já resolvidos? */
function entitlementAllows(
  ent: ResolvedEntitlements | null,
  requiredKey: string | null,
): boolean {
  if (!requiredKey) return true;
  if (!ent) return false;
  if (requiredKey in ent.features) return hasFeature(ent, requiredKey);
  if (requiredKey in ent.limites) {
    const limit = limitOf(ent, requiredKey);
    return limit === null || limit > 0;
  }
  // Entitlement exigido não existe no produto: fail-closed.
  return false;
}

/**
 * Conjunto de capabilities liberadas de um tenant/usuário em um produto.
 * Resolver uma vez por sessão e reaproveitar — nunca por componente.
 */
export async function resolveCapabilities(input: {
  productKey: string;
  entitlements: ResolvedEntitlements | null;
  viewer: CapabilityViewer;
}): Promise<string[]> {
  const caps = await loadCapabilities(input.productKey);
  return caps
    .filter(
      (cap) =>
        cap.enabled &&
        scopeAllows(cap.visibilityScope, input.viewer) &&
        entitlementAllows(input.entitlements, cap.requiredEntitlementKey),
    )
    .map((cap) => cap.key);
}

/** Checagem pontual no servidor antes de qualquer ação sensível. */
export async function canCapability(input: {
  productKey: string;
  capabilityKey: string;
  entitlements: ResolvedEntitlements | null;
  viewer: CapabilityViewer;
}): Promise<boolean> {
  const allowed = await resolveCapabilities(input);
  return allowed.includes(input.capabilityKey);
}

/** Quantas capabilities de cada produto exigem determinado entitlement. */
export async function entitlementUsage(): Promise<
  Record<string, Array<{ productKey: string; capabilities: Array<{ key: string; name: string }> }>>
> {
  const caps = await loadCapabilities();
  const out: Record<
    string,
    Array<{ productKey: string; capabilities: Array<{ key: string; name: string }> }>
  > = {};
  for (const cap of caps) {
    if (!cap.requiredEntitlementKey) continue;
    const byEnt = (out[cap.requiredEntitlementKey] ??= []);
    let group = byEnt.find((g) => g.productKey === cap.productKey);
    if (!group) {
      group = { productKey: cap.productKey, capabilities: [] };
      byEnt.push(group);
    }
    group.capabilities.push({ key: cap.key, name: cap.name });
  }
  return out;
}
