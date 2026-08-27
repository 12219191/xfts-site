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
    const startedAt = Date.now();
    const { logIntegrationEvent } = await import("@/lib/integration-log.server");
    const deny = async (reason: string, message?: string): Promise<SsoResult> => {
      await logIntegrationEvent({
        appKey: data.app,
        kind: "sso_issue",
        status: "denied",
        reason,
        userId: context.userId,
        durationMs: Date.now() - startedAt,
        environment: data.environment ?? "sandbox",
      });
      return { error: message ?? reason };
    };
    const { getFlexusApp, appKeyFromPriceId, ACTIVE_STATUSES, planTierFromPriceId, seatsFromPriceId } =
      await import("@/lib/flexus-apps");
    const app = getFlexusApp(data.app);
    if (!app) return deny("sistema inexistente", "Sistema não encontrado");
    if (!app.available || !app.url)
      return deny("sistema indisponível", `${app.name} ainda não está disponível.`);

    const env = data.environment ?? "sandbox";
    const { supabase, userId, claims } = context;

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("price_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      // Cortesias não pertencem a um ambiente de pagamento: valem em ambos.
      .or(`environment.eq.${env},is_courtesy.is.true`)
      .order("created_at", { ascending: false });

    const sub = (subs ?? []).find(
      (s) => appKeyFromPriceId(s.price_id) === app.key,
    );
    if (!sub)
      return deny("sem assinatura", `Você ainda não tem uma assinatura do ${app.name}.`);

    const periodOk =
      !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
    const allowed =
      (ACTIVE_STATUSES.includes(sub.status) && periodOk) ||
      (sub.status === "canceled" && periodOk);
    if (!allowed) {
      return deny(
        "acesso bloqueado",
        `Seu acesso ao ${app.name} está bloqueado. Regularize o pagamento.`,
      );
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
    if (insertError)
      return deny("falha ao registrar token", "Não foi possível gerar o acesso. Tente novamente.");

    const token = await signSsoToken({
      sub: userId,
      email: (claims as { email?: string })?.email ?? "",
      app: app.key,
      plan: planTierFromPriceId(sub.price_id),
      role: "owner",
      seats: seatsFromPriceId(sub.price_id),
      jti,
      iat: now,
      exp,
    });

    await logIntegrationEvent({
      appKey: app.key,
      kind: "sso_issue",
      status: "ok",
      userId: userId,
      durationMs: Date.now() - startedAt,
      environment: env,
    });

    return { ok: true, url: `${app.url}/sso?token=${encodeURIComponent(token)}` };
  });
