import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SsoResult = { ok: true; url: string } | { error: string };

/**
 * Gera um link de acesso único (válido por 2 minutos) para o sistema FLEXUS
 * do produto assinado pelo usuário, em outro domínio.
 */
export const createSsoLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { app: string; environment?: "sandbox" | "live" }) => {
    if (!/^[a-z0-9]+$/.test(data.app)) throw new Error("Sistema inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<SsoResult> => {
    const { getFlexusApp, appKeyFromPriceId, ACTIVE_STATUSES, planTierFromPriceId } =
      await import("@/lib/flexus-apps");
    const app = getFlexusApp(data.app);
    if (!app) return { error: "Sistema não encontrado" };
    if (!app.available || !app.url) return { error: `${app.name} ainda não está disponível.` };

    const env = data.environment ?? "sandbox";
    const { supabase, userId, claims } = context;

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("price_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .eq("environment", env)
      .order("created_at", { ascending: false });

    const sub = (subs ?? []).find(
      (s) => appKeyFromPriceId(s.price_id) === app.key,
    );
    if (!sub) return { error: `Você ainda não tem uma assinatura do ${app.name}.` };

    const periodOk =
      !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
    const allowed =
      (ACTIVE_STATUSES.includes(sub.status) && periodOk) ||
      (sub.status === "canceled" && periodOk);
    if (!allowed) {
      return { error: `Seu acesso ao ${app.name} está bloqueado. Regularize o pagamento.` };
    }

    const { signSsoToken } = await import("@/lib/sso.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 120;

    const { error: insertError } = await supabaseAdmin.from("sso_tokens").insert({
      jti,
      user_id: userId,
      app_key: app.key,
      expires_at: new Date(exp * 1000).toISOString(),
    });
    if (insertError) return { error: "Não foi possível gerar o acesso. Tente novamente." };

    const token = await signSsoToken({
      sub: userId,
      email: (claims as { email?: string })?.email ?? "",
      app: app.key,
      plan: planTierFromPriceId(sub.price_id),
      jti,
      iat: now,
      exp,
    });

    return { ok: true, url: `${app.url}/sso?token=${encodeURIComponent(token)}` };
  });
