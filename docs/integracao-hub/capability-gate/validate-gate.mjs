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
 *  2. Chave ausente e chave inválida são recusadas (401) — o gate não abre.
 *  3. Para o app "barbearia": compara o mapa do hub com a lista oficial de
 *     rotas/páginas do sistema (docs .../barbearia-routes.mjs) e aponta o que
 *     falta cadastrar e o que está cadastrado a mais.
 *  4. Cada capability do mapa é verificada no hub (200 liberado / 403 bloqueado).
 *  5. Rotas da Central XFTS (/superadmin/*) devem ser negadas ao tenant.
 *  6. Escopo interno da XFTS não pode ser pedido de fora (deve dar 403).
 *  7. Se SAAS_URL for informado: /api/xfts/gate responde e as rotas bloqueadas
 *     no hub também devolvem 403 no SaaS (bloqueio real, não só tela).
 *
 * Saída: tabela no terminal + exit code 1 se algo estiver inconsistente.
 */

import { ALL_BARBEARIA_ROUTES, INTERNAL_PREFIX, PARAM_ROUTES } from "./barbearia-routes.mjs";

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
    headers: key ? { "x-flexus-app-key": key } : {},
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function hubCheck(capability, actingAs = "TENANT", key = KEY) {
  const res = await fetch(`${HUB}/api/public/capability-check`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { "x-flexus-app-key": key } : {}),
    },
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

  // 2. chave ausente e chave inválida devem ser recusadas
  const noKey = await hubRoutes(null);
  add(noKey.status === 401, "Sem chave de sistema recusado", `esperado 401, veio ${noKey.status}`);
  const bad = await hubRoutes("chave-invalida-de-teste");
  add(bad.status === 401, "Chave inválida recusada", `esperado 401, veio ${bad.status}`);
  const badCheck = await hubCheck("agenda.view", "TENANT", "chave-invalida-de-teste");
  add(badCheck.status === 401, "Checagem com chave inválida recusada", `esperado 401, veio ${badCheck.status}`);

  // 3. conferência com a lista oficial de rotas do sistema
  if (APP === "barbearia") {
    const cadastradas = new Set(Object.keys(routes));
    const faltando = ALL_BARBEARIA_ROUTES.filter((r) => !cadastradas.has(r));
    const extras = [...cadastradas].filter((r) => !ALL_BARBEARIA_ROUTES.includes(r));
    add(
      faltando.length === 0,
      `Rotas oficiais cadastradas (${ALL_BARBEARIA_ROUTES.length})`,
      faltando.length ? `faltando: ${faltando.join(", ")}` : "todas presentes",
    );
    add(extras.length === 0, "Nenhuma rota fora da lista oficial", extras.length ? extras.join(", ") : "ok");
  }

  // 4. cada capability, nas duas vias: cliente comum e administrador do cliente
  const decisions = new Map();
  for (const [path, capability] of Object.entries(routes)) {
    const asTenant = await hubCheck(capability, "TENANT");
    const asAdmin = await hubCheck(capability, "TENANT_ADMIN");
    const known = [asTenant.status, asAdmin.status].every((s) => s === 200 || s === 403);
    const allowed = asAdmin.status === 200;
    decisions.set(path, allowed);
    const detail = `cliente ${asTenant.status === 200 ? "liberado" : "bloqueado"}, admin ${
      asAdmin.status === 200 ? "liberado" : asAdmin.body?.reason || `HTTP ${asAdmin.status}`
    }`;
    add(known, `${path} → ${capability}`, detail);

    // Tela do painel que só abre como cliente comum indica escopo cadastrado errado.
    if (path.startsWith("/admin") && asTenant.status === 200 && asAdmin.status !== 200) {
      add(false, `Escopo invertido em ${path}`, "abre para cliente comum e não para o administrador");
    }
  }

  // 5. Central XFTS nunca liberada ao tenant
  for (const [path, allowed] of decisions.entries()) {
    if (path.startsWith(INTERNAL_PREFIX)) {
      add(!allowed, `Central XFTS bloqueada: ${path}`, allowed ? "liberado indevidamente" : "bloqueado");
    }
  }

  // 6. escopo interno não pode vir de fora
  const internal = await hubCheck("xfts.internal.probe", "XFTS_SUPERADMIN");
  add(internal.status === 403, "Escopo interno XFTS bloqueado", `esperado 403, veio ${internal.status}`);

  // 7. gate dentro do SaaS
  if (SAAS) {
    for (const [path, allowed] of decisions.entries()) {
      if (PARAM_ROUTES.has(path)) {
        console.log(`(pulado ${path} — rota com parâmetro)`);
        continue;
      }
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
