import { beforeEach, describe, expect, it, vi } from "vitest";
import { scopeAllows, type CapabilityViewer, type VisibilityScope } from "@/lib/capabilities";
import {
  SUPPORT_TOKEN_TYP,
  signSupportToken,
  supportViewer,
  verifySupportToken,
  type SupportSessionRow,
} from "@/lib/support-session";

const SECRET = "test-support-secret-0123456789abcdef0123456789abcdef";
const KEYS: Record<string, string> = { estetica: "k-est", barbearia: "k-barb", atende: "k-atd" };
const TENANT = "11111111-1111-4111-8111-111111111111";
const OTHER_TENANT = "22222222-2222-4222-8222-222222222222";
const ACTOR = "99999999-9999-4999-8999-999999999999";

const CAPS: Record<string, { product: string; scope: VisibilityScope }> = {
  "reports.dados_360": { product: "estetica", scope: "XFTS_SUPPORT" },
  "reports.data_360": { product: "barbearia", scope: "XFTS_SUPPORT" },
  "settings.manage": { product: "estetica", scope: "TENANT_ADMIN" },
};

const audits: Array<{ action: string }> = [];
vi.mock("@/lib/admin-audit.server", () => ({
  recordAudit: async (e: { action: string }) => {
    audits.push(e);
  },
}));
vi.mock("@/lib/sso.server", () => ({
  appApiKey: (app: string) => KEYS[app],
  safeEqual: (a: string, b: string) => a === b,
}));
vi.mock("@/lib/integration-log.server", () => ({ logIntegrationEvent: vi.fn() }));
vi.mock("@/lib/entitlements.server", () => ({
  resolveUserEntitlements: async (userId: string) => ({
    ativo: userId === TENANT || userId === OTHER_TENANT,
    features: {},
    limites: {},
  }),
}));
const allowedFor = (product: string, viewer: CapabilityViewer) =>
  Object.entries(CAPS)
    .filter(([, c]) => c.product === product && scopeAllows(c.scope, viewer))
    .map(([k]) => k);
vi.mock("@/lib/capabilities.server", () => ({
  resolveCapabilities: async (i: { productKey: string; viewer: CapabilityViewer }) =>
    allowedFor(i.productKey, i.viewer),
  canCapability: async (i: { productKey: string; capabilityKey: string; viewer: CapabilityViewer }) =>
    allowedFor(i.productKey, i.viewer).includes(i.capabilityKey),
}));

// ---------- Store em memória ----------
let rows: SupportSessionRow[] = [];
const flags: Record<string, boolean> = {};
function memStore() {
  const open = (r: SupportSessionRow) => !r.ended_at;
  return {
    flagEnabled: async (a: string) => flags[a] === true,
    allFlags: async () => ({ ...flags }),
    setFlag: async (a: string, e: boolean) => {
      flags[a] = e;
    },
    endOpenFor: async (actor: string, tenant: string, app: string, reason: string) => {
      const hit = rows.filter((r) => open(r) && r.actor_id === actor && r.tenant_id === tenant && r.app_key === app);
      for (const r of hit) Object.assign(r, { ended_at: new Date().toISOString(), ended_reason: reason });
      return hit;
    },
    insert: async (row: Omit<SupportSessionRow, "id" | "created_at">) => {
      const r = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() } as SupportSessionRow;
      rows.push(r);
      return r;
    },
    consume: async (jti: string, now: string, exp: string) => {
      const r = rows.find((x) => x.jti === jti && !x.used_at && !x.ended_at && x.token_expires_at > now);
      if (!r) return null;
      Object.assign(r, { used_at: now, session_expires_at: exp });
      return r;
    },
    get: async (id: string) => rows.find((r) => r.id === id) ?? null,
    end: async (id: string, reason: string, by: string | null) => {
      const r = rows.find((x) => x.id === id && !x.ended_at);
      if (!r) return null;
      Object.assign(r, { ended_at: new Date().toISOString(), ended_reason: reason, revoked_by: by });
      return r;
    },
    listOpen: async () => rows.filter(open),
  };
}

let srv: typeof import("@/lib/support-session.server");
beforeEach(async () => {
  process.env["XFTS_SUPPORT_SESSION_SECRET"] = SECRET;
  rows = [];
  audits.length = 0;
  for (const k of Object.keys(flags)) delete flags[k];
  flags["estetica"] = true;
  flags["barbearia"] = true;
  srv = await import("@/lib/support-session.server");
  srv.setSupportStoreForTests(memStore());
});

const actor = { id: ACTOR, email: "ana@xfts.com.br", name: "Ana" };
async function issue(role: "XFTS_SUPPORT" | "XFTS_SUPERADMIN" = "XFTS_SUPPORT", app = "estetica", nowMs?: number) {
  const r = await srv.issueSupportSession({
    actor,
    role,
    tenantId: TENANT,
    appKey: app,
    reason: "Cliente pediu ajuda no relatório",
    ticket: "T-1",
    environment: "live",
    nowMs,
  });
  if ("error" in r) throw new Error(r.error);
  const token = decodeURIComponent(r.url.split("#token=")[1]!);
  return { ...r, token };
}

describe("token de suporte", () => {
  it("vai no fragmento da URL, não na query", async () => {
    const { url } = await issue();
    expect(url).toMatch(/\/support#token=/);
    expect(url).not.toContain("?token=");
  });
  it("token expirado → 401", async () => {
    const { token } = await issue("XFTS_SUPPORT", "estetica", Date.now() - 6 * 60_000);
    const r = await srv.verifyAndConsume(token, KEYS["estetica"]!);
    expect(r.status).toBe(401);
  });
  it("token reutilizado → 401 na segunda troca", async () => {
    const { token } = await issue();
    expect((await srv.verifyAndConsume(token, KEYS["estetica"]!)).status).toBe(200);
    expect((await srv.verifyAndConsume(token, KEYS["estetica"]!)).status).toBe(401);
  });
  it("assinatura inválida (outra chave, ex.: a do SSO) → 401", async () => {
    const now = Math.floor(Date.now() / 1000);
    const forged = await signSupportToken("chave-do-sso-nao-e-esta", {
      typ: SUPPORT_TOKEN_TYP,
      actor_id: ACTOR,
      actor_email: "x@x",
      actor_name: "X",
      role: "XFTS_SUPERADMIN",
      tenant_id: TENANT,
      app_key: "estetica",
      aud: "estetica",
      reason: "r",
      ticket: null,
      jti: "j",
      iat: now,
      exp: now + 60,
    });
    expect((await verifySupportToken(SECRET, forged)).ok).toBe(false);
    expect((await srv.verifyAndConsume(forged, KEYS["estetica"]!)).status).toBe(401);
  });
  it("token de um app usado por outro → 403", async () => {
    const { token } = await issue();
    expect((await srv.verifyAndConsume(token, KEYS["barbearia"]!)).status).toBe(403);
  });
  it("app sem a flag não emite sessão nova", async () => {
    const r = await srv.issueSupportSession({
      actor, role: "XFTS_SUPPORT", tenantId: TENANT, appKey: "atende", reason: "motivo ok", ticket: null, environment: "live",
    });
    expect("error" in r).toBe(true);
  });
  it("troca devolve identidade própria, nunca o admin do cliente", async () => {
    const { token } = await issue();
    const r = await srv.verifyAndConsume(token, KEYS["estetica"]!);
    expect(r.body["actor"]).toMatchObject({ display_name: "Ana (XFTS Suporte)", id: ACTOR });
    expect(r.body["role"]).toBe("XFTS_SUPPORT");
    expect(r.body["can_write"]).toBe(false);
    expect(r.body["capabilities"]).toContain("reports.dados_360");
    expect(r.body["capabilities"]).not.toContain("settings.manage");
    expect(audits.map((a) => a.action)).toEqual(["support_session.issued", "support_session.used"]);
  });
});

describe("amarração ao app e ao tenant", () => {
  async function opened(role: "XFTS_SUPPORT" | "XFTS_SUPERADMIN" = "XFTS_SUPPORT") {
    const { token } = await issue(role);
    const r = await srv.verifyAndConsume(token, KEYS["estetica"]!);
    return String(r.body["session_id"]);
  }
  it("sessão de um app usada por outro → 403 (status/end/audit)", async () => {
    const sid = await opened();
    expect((await srv.sessionStatus(sid, KEYS["barbearia"]!, TENANT)).status).toBe(403);
    expect((await srv.endBySystem(sid, KEYS["barbearia"]!, TENANT)).status).toBe(403);
    expect((await srv.recordWrite(sid, KEYS["barbearia"]!, TENANT, { action: "x" })).status).toBe(403);
    expect(audits.some((a) => a.action === "support_session.mismatch")).toBe(true);
  });
  it("tenant diferente → 403", async () => {
    const sid = await opened();
    expect((await srv.sessionStatus(sid, KEYS["estetica"]!, OTHER_TENANT)).status).toBe(403);
    expect((await srv.recordWrite(sid, KEYS["estetica"]!, OTHER_TENANT, { action: "x" })).status).toBe(403);
  });
  it("suporte tentando escrever → 403; superadmin → 200", async () => {
    const sid = await opened("XFTS_SUPPORT");
    const denied = await srv.recordWrite(sid, KEYS["estetica"]!, TENANT, { action: "cliente.update" });
    expect(denied.status).toBe(403);
    expect(audits.some((a) => a.action === "support_session.write_denied")).toBe(true);
    const sid2 = await (async () => {
      const { token } = await srv
        .issueSupportSession({ actor: { ...actor, id: "88888888-8888-4888-8888-888888888888" }, role: "XFTS_SUPERADMIN", tenantId: TENANT, appKey: "estetica", reason: "corrigir cadastro", ticket: null, environment: "live" })
        .then((r) => ("error" in r ? Promise.reject(r.error) : { token: decodeURIComponent(r.url.split("#token=")[1]!) }));
      return String((await srv.verifyAndConsume(token, KEYS["estetica"]!)).body["session_id"]);
    })();
    expect((await srv.recordWrite(sid2, KEYS["estetica"]!, TENANT, { action: "cliente.update" })).status).toBe(200);
  });
  it("revogada ou acima de 60 min → active=false", async () => {
    const sid = await opened();
    expect((await srv.sessionStatus(sid, KEYS["estetica"]!, TENANT)).body["active"]).toBe(true);
    const later = Date.now() + 61 * 60_000;
    expect((await srv.sessionStatus(sid, KEYS["estetica"]!, TENANT, later)).body["active"]).toBe(false);
    const sid2 = await opened();
    await srv.revokeSupportSession(sid2, { id: ACTOR, email: "a@x" }, "encerrado pelo gestor");
    expect((await srv.sessionStatus(sid2, KEYS["estetica"]!, TENANT)).body["active"]).toBe(false);
  });
  it("uma sessão aberta por atendente+tenant+app: abrir outra encerra a anterior", async () => {
    const first = await issue();
    await issue();
    const r1 = rows.find((r) => r.id === first.sessionId)!;
    expect(r1.ended_reason).toBe("replaced");
    expect(rows.filter((r) => !r.ended_at)).toHaveLength(1);
  });
  it("rotina marca sessões vencidas como expired e audita", async () => {
    await opened();
    const n = await srv.expireSupportSessions(Date.now() + 61 * 60_000);
    expect(n).toBe(1);
    expect(rows[0]!.ended_reason).toBe("expired");
    expect(audits.some((a) => a.action === "support_session.expired")).toBe(true);
  });
});

describe("capability-check com sessão de suporte", () => {
  async function call(body: Record<string, unknown>, key: string) {
    const { Route } = await import("@/routes/api/public/capability-check");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = (Route.options as any).server.handlers.POST;
    const res: Response = await post({
      request: new Request("http://hub/api/public/capability-check", {
        method: "POST",
        headers: { "content-type": "application/json", "x-flexus-app-key": key },
        body: JSON.stringify(body),
      }),
    });
    return res.status;
  }
  it("acting_as interno vindo de sistema externo continua 403", async () => {
    const b = { app: "estetica", user_id: TENANT, capability: "reports.dados_360" };
    expect(await call({ ...b, acting_as: "XFTS_SUPPORT" }, KEYS["estetica"]!)).toBe(403);
    expect(await call({ ...b, acting_as: "XFTS_SUPERADMIN" }, KEYS["estetica"]!)).toBe(403);
  });
  it("Dados 360 liberado só pela sessão assinada; sessão de outro tenant/app → 403", async () => {
    const { token } = await issue();
    const sid = String((await srv.verifyAndConsume(token, KEYS["estetica"]!)).body["session_id"]);
    const b = { app: "estetica", user_id: TENANT, capability: "reports.dados_360", support_session_id: sid };
    expect(await call(b, KEYS["estetica"]!)).toBe(200);
    expect(await call({ ...b, user_id: OTHER_TENANT }, KEYS["estetica"]!)).toBe(403);
    expect(await call({ ...b, app: "barbearia" }, KEYS["barbearia"]!)).toBe(403);
  });
});

describe("Dados 360 exclusivo XFTS", () => {
  const admin: CapabilityViewer = { actingAs: "TENANT_ADMIN" };
  for (const key of ["reports.dados_360", "reports.data_360"]) {
    const scope = CAPS[key]!.scope;
    it(`${key}: TENANT_ADMIN bloqueado, XFTS_SUPPORT/XFTS_SUPERADMIN liberados`, () => {
      expect(scopeAllows(scope, admin)).toBe(false);
      expect(scopeAllows(scope, { actingAs: "TENANT" })).toBe(false);
      expect(scopeAllows(scope, supportViewer("XFTS_SUPPORT"))).toBe(true);
      expect(scopeAllows(scope, supportViewer("XFTS_SUPERADMIN"))).toBe(true);
    });
  }
});
