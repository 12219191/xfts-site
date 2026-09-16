import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Verificação central `can("capability.key")` no servidor.
 * A UI usa o conjunto já resolvido da sessão; esta função é a checagem
 * obrigatória antes de qualquer ação sensível.
 */
export const canCapabilityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productKey: string; capabilityKey: string }) => data)
  .handler(async ({ data, context }): Promise<{ allowed: boolean; reason: string | null }> => {
    const { canForUser } = await import("@/lib/authz.server");
    return canForUser({
      supabase: context.supabase,
      userId: context.userId,
      productKey: data.productKey,
      capabilityKey: data.capabilityKey,
    });
  });

/** Conjunto de capabilities liberadas do usuário em um produto. */
export const myCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productKey: string }) => data)
  .handler(async ({ data, context }): Promise<string[]> => {
    const { capabilitiesForUser } = await import("@/lib/authz.server");
    return capabilitiesForUser({
      supabase: context.supabase,
      userId: context.userId,
      productKey: data.productKey,
    });
  });
