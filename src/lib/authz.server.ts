/**
 * Serviço central de autorização (server-only).
 *
 * ALLOW = capability ativa
 *       E tenant possui o entitlement exigido (quando houver)
 *       E papel/permissão do usuário compatível com o visibility_scope.
 *
 * Nunca confia em papel enviado pelo cliente: o escopo efetivo é sempre
 * derivado da identidade autenticada (admin_roles + assinatura do tenant).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CapabilityViewer, VisibilityScope } from "@/lib/capabilities";

/** Erro de autorização: as rotas/serverFns traduzem para 403. */
export class CapabilityDeniedError extends Error {
  readonly status = 403;
  constructor(message = "Acesso negado a este recurso.") {
    super(message);
    this.name = "CapabilityDeniedError";
  }
}

/**
 * Escopo efetivo do usuário autenticado.
 * `actingAs` é o papel usado dentro do tenant (impersonation mantém o actor
 * real da XFTS separado: o usuário XFTS nunca se torna o usuário do cliente).
 */
export async function resolveViewer(input: {
  supabase: SupabaseClient;
  userId: string;
  productKey: string;
  /** Papel dentro do tenant, quando o sistema informar (padrão: titular). */
  actingAs?: VisibilityScope;
}): Promise<CapabilityViewer> {
  const { loadAdminRoles } = await import("@/lib/admin-rbac.server");

  let roles: string[] = [];
  try {
    roles = await loadAdminRoles(input.supabase, input.userId);
  } catch {
    roles = [];
  }

  const isXftsSuperadmin = roles.includes("superadmin");
  const isXftsSupport = isXftsSuperadmin || roles.includes("suporte");

  // Suporte (sem superadmin) é sempre fixado no escopo XFTS_SUPPORT: nunca
  // assume o papel de administrador do cliente, mesmo se o cliente pedir.
  const supportOnly = isXftsSupport && !isXftsSuperadmin;
  const actingAs: VisibilityScope = supportOnly
    ? "XFTS_SUPPORT"
    : (input.actingAs ?? "TENANT_ADMIN");

  return { actingAs, isXftsSupport, isXftsSuperadmin };
}

/** Decisão central: pode usar esta capability neste produto? */
export async function canForUser(input: {
  supabase: SupabaseClient;
  userId: string;
  productKey: string;
  capabilityKey: string;
  actingAs?: VisibilityScope;
}): Promise<{ allowed: boolean; reason: string | null }> {
  const { resolveUserEntitlements } = await import("@/lib/entitlements.server");
  const { canCapability } = await import("@/lib/capabilities.server");

  const entitlements = await resolveUserEntitlements(input.userId, input.productKey);
  const viewer = await resolveViewer(input);

  // Escopos internos da XFTS não dependem de assinatura ativa do tenant.
  const internal = viewer.isXftsSupport || viewer.isXftsSuperadmin;
  if (!entitlements.ativo && !internal) {
    return { allowed: false, reason: "Assinatura inativa para este sistema." };
  }

  const allowed = await canCapability({
    productKey: input.productKey,
    capabilityKey: input.capabilityKey,
    entitlements,
    viewer,
  });

  return {
    allowed,
    reason: allowed ? null : "Este recurso não está liberado para o seu plano ou perfil.",
  };
}

/** Uso em qualquer operação sensível: lança 403 quando negado. */
export async function requireCapability(input: {
  supabase: SupabaseClient;
  userId: string;
  productKey: string;
  capabilityKey: string;
  actingAs?: VisibilityScope;
}): Promise<void> {
  const { allowed, reason } = await canForUser(input);
  if (!allowed) throw new CapabilityDeniedError(reason ?? undefined);
}

/** Todas as capabilities liberadas do usuário no produto (uma consulta). */
export async function capabilitiesForUser(input: {
  supabase: SupabaseClient;
  userId: string;
  productKey: string;
  actingAs?: VisibilityScope;
}): Promise<string[]> {
  const { resolveUserEntitlements } = await import("@/lib/entitlements.server");
  const { resolveCapabilities } = await import("@/lib/capabilities.server");

  const entitlements = await resolveUserEntitlements(input.userId, input.productKey);
  const viewer = await resolveViewer(input);
  return resolveCapabilities({ productKey: input.productKey, entitlements, viewer });
}
