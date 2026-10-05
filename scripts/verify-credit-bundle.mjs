// Regressão do bundle de PRODUÇÃO do credit_cycle (Atende).
// Uso: bun run build && node scripts/verify-credit-bundle.mjs [distDir]
// Chama o creditCycleForSub EMITIDO com um catálogo falso servido localmente
// (nenhum banco/Stripe real é tocado) e exige: sub ativa → ciclo elegível;
// null → negativo. Pega o caso em que o bundler removia o ramo positivo.
import http from "node:http";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dist = resolve(process.argv[2] ?? "dist", "server/assets");
const file = readdirSync(dist).find((f) => /^entitlements\.server-.*\.js$/.test(f));
if (!file) throw new Error("chunk entitlements.server não encontrado em " + dist);

const server = http.createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url?.startsWith("/rest/v1/catalog_plans")) {
    res.end(JSON.stringify([{ price_lookup_key: "atende_corporate_monthly", annual_lookup_key: "atende_corporate_yearly" }]));
  } else {
    res.statusCode = 404;
    res.end("[]");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-not-a-key";

const fail = (msg, v) => {
  console.error("FALHA:", msg, JSON.stringify(v));
  server.close();
  process.exit(1);
};
try {
  const m = await import(pathToFileURL(join(dist, file)).href);
  if (typeof m.creditCycleForSub !== "function") fail("creditCycleForSub não exportado", Object.keys(m));
  const now = Date.now();
  const iso = (d) => new Date(now + d * 864e5).toISOString();
  const sub = {
    id: "00000000-0000-4000-8000-000000000001",
    price_id: "atende_corporate_monthly",
    status: "active",
    environment: "live",
    current_period_start: iso(-1),
    current_period_end: iso(20),
    is_courtesy: false,
    credit_anchor: iso(-1),
  };
  const pos = await m.creditCycleForSub(sub);
  if (pos.version !== "atende-credits-1" || !pos.eligible || pos.subscription_id !== sub.id ||
      pos.anchor !== sub.credit_anchor || pos.billing_interval !== "month" || pos.reason !== null) {
    fail("sub ativa não gerou ciclo válido", pos);
  }
  const neg = await m.creditCycleForSub(null);
  if (neg.version !== "atende-credits-1" || neg.eligible || neg.subscription_id !== null ||
      neg.reason !== "no_active_subscription") {
    fail("null não gerou ciclo negativo", neg);
  }
  console.log("OK bundle produção:", file, "positivo e negativo corretos");
} finally {
  server.close();
}
