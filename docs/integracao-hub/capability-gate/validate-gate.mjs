#!/usr/bin/env node
/**
 * Validador automático do capability gate.
 *
 * Uso (dentro do SaaS ou de qualquer máquina):
 *   XFTS_HUB_URL=https://xfts-flexus.com \
 *   XFTS_APP=barbearia \
 *   XFTS_APP_KEY=<chave do sistema> \
 *   XFTS_USER_ID=<uuid de um usuário real do tenant> \
 *   [SAAS_URL=https://barbearia.exemplo.com] \
 *   [SAAS_COOKIE="sessao=..."] \
 *   node validate-gate.mjs
 *
 * O que ele checa:
 *  1. Mapa de telas do hub responde e traz rotas.
 *  2. Chave inválida é recusada (401) — o gate não é aberto.
 *  3. Cada capability do mapa é verificada no hub (200 liberado / 403 bloqueado).
 *  4. Escopo interno da XFTS não pode ser pedido de fora (deve dar 403).
 *  5. Se SAAS_URL for informado: /api/xfts/gate responde e as rotas bloqueadas
 *     no hub também devolvem 403 no SaaS (bloqueio real, não só tela).
 *
 * Saída: tabela no terminal + exit code 1 se algo estiver inconsistente.
 */

const HUB = process.env.XFTS_HUB_URL || "https://xfts-flexus.com";
const APP = process.env.XFTS_APP;
const KEY = process.env.XFTS_APP_KEY;
const USER = process.env.XFTS_USER_ID;
const SAAS = process.env.SAAS_URL;
const COOKIE = process.env.SAAS_COOKIE;

if (!APP || !KEY || !USER) {
  console.error("Defina XFTS_APP, XFTS_APP_KEY e XFTS_USER_ID.");
  process.exit(2);
}

const results = [];
const add = (ok, step, detail = "") => {
  results.push({ ok, step, detail });
  console.log(`${ok ? "OK  " : "FALHA"} ${step}${detail ? ` — ${detail}` : ""}`);
};

async function hubRoutes(key = KEY) {
  const res = await fetch(`${HUB}/api/public/capability-routes?app=${encodeURIComponent(APP)}`, {
    headers: { "x-flexus-app-key": key },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function hubCheck(capability, actingAs = "TENANT") {
  const res = await fetch(`${HUB}/api/public/capability-check`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-flexus-app-key": KEY },
    body: JSON.stringify({ app: APP, user_id: USER, capability, acting_as: actingAs }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function saasGate(path) {
  const res = await fetch(`${SAAS}/api/xfts/gate?path=${encodeURIComponent(path)}`, {
    headers: COOKIE ? { cookie: COOKIE } : {},
    redirect: "manual",
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const main = async () => {
  console.log(`\nSistema: ${APP}   Hub: ${HUB}\n`);

  // 1. mapa de telas
  const map = await hubRoutes();
  const routes = map.body?.routes ?? {};
  const routeCount = Object.keys(routes).length;
  add(map.status === 200 && routeCount > 0, "Mapa de telas do hub", `${map.status}, ${routeCount} rota(s)`);

  // 2. chave inválida deve ser recusada
  const bad = await hubRoutes("chave-invalida-de-teste");
  add(bad.status === 401, "Chave inválida recusada", `esperado 401, veio ${bad.status}`);

  // 3. cada capability
  const decisions = new Map();
  for (const [path, capability] of Object.entries(routes)) {
    const r = await hubCheck(capability);
    const known = r.status === 200 || r.status === 403;
    decisions.set(path, r.status === 200);
    add(known, `${path} → ${capability}`, r.status === 200 ? "liberado" : r.body?.reason || `HTTP ${r.status}`);
  }

  // 4. escopo interno não pode vir de fora
  const internal = await hubCheck("xfts.internal.probe", "XFTS_SUPERADMIN");
  add(internal.status === 403, "Escopo interno XFTS bloqueado", `esperado 403, veio ${internal.status}`);

  // 5. gate dentro do SaaS
  if (SAAS) {
    for (const [path, allowed] of decisions.entries()) {
      const g = await saasGate(path);
      if (g.status === 401) {
        add(false, `SaaS ${path}`, "401 — sessão ausente (defina SAAS_COOKIE)");
        continue;
      }
      const expected = allowed ? 200 : 403;
      add(g.status === expected, `SaaS ${path}`, `esperado ${expected}, veio ${g.status}`);
    }
  } else {
    console.log("(SAAS_URL não informado — validação dentro do sistema foi pulada)");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
  if (failed.length) {
    console.log("\nPendências:");
    for (const f of failed) console.log(` - ${f.step}: ${f.detail}`);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error("Erro inesperado:", err?.message ?? err);
  process.exit(1);
});
