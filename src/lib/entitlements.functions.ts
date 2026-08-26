import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResolvedEntitlements } from "@/lib/entitlements";

export interface UserEntitlements extends ResolvedEntitlements {
  seatsUsed: number;
}

/**
 * Entitlements do usuário logado, por produto assinado.
 * Sempre resolvido no servidor: o cliente só usa para exibir/bloquear a UI.
 */
export const getMyEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserEntitlements[]> => {
    const { appKeyFromPriceId } = await import("@/lib/flexus-apps");
    const { resolveUserEntitlements } = await import("@/lib/entitlements.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("price_id")
      .eq("user_id", context.userId);

    const productKeys: string[] = Array.from(
      new Set(
        (subs ?? [])
          .map((s) => appKeyFromPriceId((s as { price_id: string }).price_id))
          .filter((k) => !!k) as string[],
      ),
    );


    return Promise.all(productKeys.map((key) => resolveUserEntitlements(context.userId, key)));
  });

/** Checagem pontual no servidor (usar antes de qualquer ação sensível). */
export const checkEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productKey: string; key: string; used?: number }) => data)
  .handler(
    async ({
      data,
      context,
    }): Promise<{ allowed: boolean; limit: number | null; reason: string | null }> => {
      const { resolveUserEntitlements } = await import("@/lib/entitlements.server");
      const ent = await resolveUserEntitlements(context.userId, data.productKey);

      if (!ent.ativo) {
        return { allowed: false, limit: 0, reason: "Assinatura inativa para este sistema." };
      }
      if (data.key in ent.features) {
        return {
          allowed: ent.features[data.key] === true,
          limit: null,
          reason: ent.features[data.key] ? null : "Recurso não incluído no seu plano.",
        };
      }
      const limit = ent.limites[data.key] ?? 0;
      const used = data.used ?? 0;
      const allowed = limit === null || used < limit;
      return {
        allowed,
        limit,
        reason: allowed ? null : `Limite do plano atingido (${limit}).`,
      };
    },
  );
