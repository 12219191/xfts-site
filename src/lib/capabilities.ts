/**
 * Capabilities: funcionalidades reais de cada SaaS, ligadas (opcionalmente) a um
 * entitlement comercial. Este arquivo é client-safe — tipos e helpers de UI.
 */

export const VISIBILITY_SCOPES = [
  "TENANT",
  "TENANT_ADMIN",
  "XFTS_SUPPORT",
  "XFTS_SUPERADMIN",
  "SYSTEM",
] as const;

export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export const SCOPE_LABELS: Record<VisibilityScope, string> = {
  TENANT: "Cliente (todos os usuários)",
  TENANT_ADMIN: "Administrador do cliente",
  XFTS_SUPPORT: "Suporte XFTS",
  XFTS_SUPERADMIN: "Superadmin XFTS",
  SYSTEM: "Sistema (uso interno)",
};

export const RESOURCE_TYPES = [
  "UI_ROUTE",
  "API_ENDPOINT",
  "ACTION",
  "REPORT",
  "EXPORT",
  "AUTOMATION",
  "AI_FEATURE",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface CapabilityResource {
  id: string;
  capabilityId: string;
  resourceType: ResourceType;
  resourceKey: string;
}

export interface Capability {
  id: string;
  productKey: string;
  key: string;
  name: string;
  description: string;
  category: string;
  /** Entitlement exigido (chave em entitlement_definitions). null = não exige plano. */
  requiredEntitlementKey: string | null;
  visibilityScope: VisibilityScope;
  enabled: boolean;
  sortOrder: number;
  resources: CapabilityResource[];
}

/**
 * Papel efetivo de quem está usando a capability.
 * `actor` é o usuário real (XFTS quando em suporte); `actingAs` é o papel usado
 * dentro do tenant. Nunca transformamos o usuário XFTS no usuário do cliente.
 */
export interface CapabilityViewer {
  actingAs: VisibilityScope;
  isXftsSupport?: boolean;
  isXftsSuperadmin?: boolean;
}

/** O escopo da capability é compatível com quem está acessando? */
export function scopeAllows(scope: VisibilityScope, viewer: CapabilityViewer): boolean {
  switch (scope) {
    case "TENANT":
      // Suporte XFTS não entra no tenant: só vê o que é do escopo de suporte.
      return viewer.actingAs !== "XFTS_SUPPORT";
    case "TENANT_ADMIN":
      // Suporte NÃO herda o papel de administrador do cliente.
      return viewer.actingAs === "TENANT_ADMIN" || !!viewer.isXftsSuperadmin;
    case "XFTS_SUPPORT":
      return !!viewer.isXftsSupport || !!viewer.isXftsSuperadmin;
    case "XFTS_SUPERADMIN":
      return !!viewer.isXftsSuperadmin;
    case "SYSTEM":
      return false;
    default:
      return false;
  }
}

/** Verificação client-side (apenas UI) sobre o conjunto já resolvido no servidor. */
export function makeCan(allowed: string[] | null | undefined) {
  const set = new Set(allowed ?? []);
  return (capabilityKey: string) => set.has(capabilityKey);
}

export function capabilityCategories(caps: Capability[]): string[] {
  return Array.from(new Set(caps.map((c) => c.category).filter(Boolean))).sort();
}
