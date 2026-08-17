import { signSsoToken, appApiKey } from "../src/lib/sso.server";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const app = "barbearia" as const;
const { data: subs } = await supabaseAdmin.from("subscriptions").select("user_id, price_id, status, environment").order("created_at", { ascending: false }).limit(5);
console.log("assinaturas:", subs);
const userId = subs?.[0]?.user_id ?? "00000000-0000-0000-0000-000000000001";
const jti = crypto.randomUUID();
const now = Math.floor(Date.now() / 1000);
const token = await signSsoToken({ sub: userId, email: "teste@xfts.com.br", app, plan: subs?.[0]?.price_id ?? null, jti, iat: now, exp: now + 120 });
const { error } = await supabaseAdmin.from("sso_tokens").insert({ jti, user_id: userId, app, expires_at: new Date((now + 120) * 1000).toISOString() } as never);
console.log("insert erro:", error?.message ?? "ok");
const key = appApiKey(app)!;
for (const attempt of [1, 2]) {
  const r = await fetch("http://localhost:8080/api/public/sso/verify", { method: "POST", headers: { "content-type": "application/json", "x-flexus-app-key": key }, body: JSON.stringify({ token }) });
  console.log(`verify tentativa ${attempt}:`, r.status, await r.text());
}
const e = await fetch(`http://localhost:8080/api/public/entitlements?app=${app}&user_id=${userId}`, { headers: { "x-flexus-app-key": key } });
console.log("entitlements:", e.status, await e.text());
const bad = await fetch(`http://localhost:8080/api/public/entitlements?app=${app}&user_id=${userId}`, { headers: { "x-flexus-app-key": "chave-errada" } });
console.log("entitlements chave errada:", bad.status);
