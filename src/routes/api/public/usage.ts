import { createFileRoute } from "@tanstack/react-router";
import { appApiKey, safeEqual } from "@/lib/sso.server";
import { FLEXUS_APPS, appKeyFromPriceId, type FlexusAppKey } from "@/lib/flexus-apps";
import { parseUsageReport, shouldStore, USAGE_RATE_PER_MIN } from "@/lib/usage-report";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Identifica o app pela chave (comparação em tempo constante com todas). */
function appFromKey(key: string): FlexusAppKey | null {
  let found: FlexusAppKey | null = null;
  for (const a of FLEXUS_APPS) {
    const expected = appApiKey(a.key as FlexusAppKey);
    if (expected && safeEqual(key, expected)) found = a.key as FlexusAppKey;
  }
  return found;
}

/**
 * Relato de "usuários em uso" enviado por cada sistema. Informativo:
 * não altera cobrança, acesso nem entitlements.
 */
export const Route = createFileRoute("/api/public/usage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("x-flexus-app-key") ?? "";
        const app = key ? appFromKey(key) : null;
        if (!app) return json({ ok: false, error: "chave inválida" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: allowed } = await supabaseAdmin.rpc("hit_rate_limit", {
          _bucket: `usage:${app}`,
          _limit: USAGE_RATE_PER_MIN,
        });
        if (allowed === false) return json({ ok: false, error: "limite de taxa" }, 429);

        let raw: unknown;
        try {
          raw = JSON.parse(await request.text());
        } catch {
          return json({ ok: false, error: "JSON inválido" }, 400);
        }
        const parsed = parseUsageReport(raw);
        if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
        const r = parsed.value;

        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("id, price_id, seats_reported_ts")
          .eq("user_id", r.user_id)
          .order("created_at", { ascending: false });
        const mine = (subs ?? []).filter((s) => appKeyFromPriceId(s.price_id) === app);
        if (mine.length === 0) return json({ ok: false, error: "assinatura não encontrada" }, 404);

        const iso = new Date(r.ts).toISOString();
        for (const s of mine) {
          if (!shouldStore(r.ts, s.seats_reported_ts)) continue;
          await supabaseAdmin
            .from("subscriptions")
            .update({ seats_used: r.usuarios_em_uso, seats_reported_at: new Date().toISOString(), seats_reported_ts: iso })
            .eq("id", s.id)
            .or(`seats_reported_ts.is.null,seats_reported_ts.lte.${iso}`);
        }
        return json({ ok: true });
      },
    },
  },
});
