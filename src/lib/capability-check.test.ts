import { beforeEach, describe, expect, it, vi } from "vitest";
import { scopeAllows, type CapabilityViewer, type VisibilityScope } from "@/lib/capabilities";
import { effectiveViewer, parseActingAs } from "@/lib/capability-check";

// ---------- Fixtures (sem banco, sem segredos reais) ----------
const KEYS: Record<string, string> = { casa360: "k-casa", barbearia: "k-barb" };
const OWNER_PRO = "11111111-1111-4111-8111-111111111111"; // titular Pro casa360
const OWNER_BASIC = "22222222-2222-4222-8222-222222222222"; // titular sem feature
const MEMBER = "33333333-3333-4333-8333-333333333333"; // membro: sem assinatura no hub
const OWNER_B = "55555555-5555-4555-8555-555555555555"; // outro titular casa360
const BARB_OWNER = "44444444-4444-4444-8444-444444444444"; // titular de outro app

const SUBS: Record<string, { app: string; features: Record<string, boolean> }> = {
  [OWNER_PRO]: { app: "casa360", features: { relatorios_avancados: true } },
  [OWNER_BASIC]: { app: "casa360", features: { relatorios_avancados: false } },
  [OWNER_B]: { app: "casa360", features: { relatorios_avancados: true } },
  [BARB_OWNER]: { app: "barbearia", features: { relatorios_avancados: true } },
};

const CAPS: Record<string, { scope: VisibilityScope; req: string | null }> = {
  "settings.manage": { scope: "TENANT_ADMIN", req: null },
  "dashboard.view": { scope: "TENANT", req: null },
  "reports.financial_analysis": { scope: "TENANT_ADMIN", req: "relatorios_avancados" },
  "internal.tool": { scope: "XFTS_SUPERADMIN", req: null },
};

vi.mock("@/lib/sso.server", () => ({
  appApiKey: (app: string) => KEYS[app],
  safeEqual: (a: string, b: string) => a === b,
}));
vi.mock("@/lib/integration-log.server", () => ({ logIntegrationEvent: vi.fn() }));
vi.mock("@/lib/entitlements.server", () => ({
  resolveUserEntitlements: async (userId: string, app: string) => {
    const s = SUBS[userId];
    const ativo = !!s && s.app === app;
    return { ativo, features: ativo ? s!.features : {}, limites: {} };
  },
}));
vi.mock("@/lib/capabilities.server", () => ({
  canCapability: async (i: {
    capabilityKey: string;
    entitlements: { features: Record<string, boolean> };
    viewer: CapabilityViewer;
  }) => {
    const c = CAPS[i.capabilityKey];
    if (!c) return false;
    return scopeAllows(c.scope, i.viewer) && (!c.req || i.entitlements.features[c.req] === true);
  },
}));

async function call(body: Record<string, unknown>, key: string | null = "k-casa") {
  const { Route } = await import("@/routes/api/public/capability-check");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = (Route.options as any).server.handlers.POST;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers["x-flexus-app-key"] = key;
  const res: Response = await post({
    request: new Request("http://hub/api/public/capability-check", {
      method: "POST",
      headers,
      body: JSON.stringify({ app: "casa360", ...body }),
    }),
  });
  return res.status;
}

describe("parseActingAs / verifiedViewer", () => {
  it("aceita só TENANT/TENANT_ADMIN; internos 403; desconhecidos 400", () => {
    expect(parseActingAs("TENANT")).toEqual({ ok: true, value: "TENANT" });
    expect(parseActingAs(undefined)).toEqual({ ok: true, value: "TENANT" });
    expect(parseActingAs("XFTS_SUPERADMIN")).toMatchObject({ ok: false, status: 403 });
    expect(parseActingAs("XFTS_SUPPORT")).toMatchObject({ ok: false, status: 403 });
    expect(parseActingAs("SYSTEM")).toMatchObject({ ok: false, status: 403 });
    expect(parseActingAs("OWNER")).toMatchObject({ ok: false, status: 400 });
    expect(parseActingAs("FOO")).toMatchObject({ ok: false, status: 400 });
    expect(parseActingAs(1)).toMatchObject({ ok: false, status: 400 });
  });
  it("viewer: sem titular ativo nega; com titular usa o declarado como teto", () => {
    expect(effectiveViewer(false, "TENANT_ADMIN")).toBeNull();
    expect(effectiveViewer(true, "TENANT")).toEqual({ actingAs: "TENANT", isXftsSupport: false, isXftsSuperadmin: false });
    expect(effectiveViewer(true, "TENANT_ADMIN")?.actingAs).toBe("TENANT_ADMIN");
  });
});

describe("POST /api/public/capability-check", () => {
  beforeEach(() => vi.clearAllMocks());
  const sm = { capability: "settings.manage" };

  it("admin legítimo (SaaS declara TENANT_ADMIN pelo seu RBAC) abre Configurações", async () => {
    expect(await call({ ...sm, user_id: OWNER_PRO, acting_as: "TENANT_ADMIN" })).toBe(200);
  });
  it("membro/leitor representado pelo hub_user_id do titular, declarado TENANT: negado", async () => {
    expect(await call({ ...sm, user_id: OWNER_PRO, acting_as: "TENANT" })).toBe(403);
    expect(await call({ ...sm, user_id: OWNER_PRO })).toBe(403); // ausente = TENANT
    // mas continua vendo telas de membro do plano do titular
    expect(await call({ capability: "dashboard.view", user_id: OWNER_PRO, acting_as: "TENANT" })).toBe(200);
  });
  it("outro titular do MESMO app é avaliado pela própria assinatura", async () => {
    expect(await call({ ...sm, user_id: OWNER_B, acting_as: "TENANT" })).toBe(403);
    expect(await call({ ...sm, user_id: OWNER_B, acting_as: "TENANT_ADMIN" })).toBe(200);
  });
  it("LIMITAÇÃO v1: TENANT_ADMIN forjado por backend do SaaS com chave válida não é detectável", async () => {
    // Documenta o limite de confiança: a chave do app autentica o SaaS, não o ator.
    expect(await call({ ...sm, user_id: OWNER_PRO, acting_as: "TENANT_ADMIN" })).toBe(200);
  });
  it("sem assinatura no hub é negado mesmo declarando TENANT_ADMIN", async () => {
    expect(await call({ ...sm, user_id: MEMBER, acting_as: "TENANT_ADMIN" })).toBe(403);
  });
  it("perfis desconhecidos/forjados não liberam", async () => {
    expect(await call({ ...sm, user_id: OWNER_PRO, acting_as: "OWNER" })).toBe(400);
    expect(await call({ ...sm, user_id: OWNER_PRO, acting_as: "FOO" })).toBe(400);
    expect(await call({ ...sm, user_id: MEMBER, acting_as: "OWNER" })).toBe(400);
    expect(await call({ ...sm, user_id: OWNER_PRO, acting_as: "XFTS_SUPERADMIN" })).toBe(403);
  });
  it("chave de SaaS nunca libera escopo interno", async () => {
    expect(await call({ capability: "internal.tool", user_id: OWNER_PRO, acting_as: "TENANT_ADMIN" })).toBe(403);
    expect(
      await call({ capability: "internal.tool", user_id: OWNER_PRO, acting_as: "XFTS_SUPERADMIN" }),
    ).toBe(403);
  });
  it("sem feature do plano continua bloqueado (sem ampliar entitlements)", async () => {
    const adm = { acting_as: "TENANT_ADMIN" };
    expect(await call({ capability: "reports.financial_analysis", user_id: OWNER_BASIC, ...adm })).toBe(403);
    expect(await call({ capability: "reports.financial_analysis", user_id: OWNER_PRO, ...adm })).toBe(200);
    expect(await call({ ...sm, user_id: OWNER_BASIC, ...adm })).toBe(200); // settings não exige feature
  });
  it("outro app/tenant e chaves inválidas", async () => {
    expect(await call({ ...sm, user_id: BARB_OWNER, acting_as: "TENANT_ADMIN" })).toBe(403); // titular de barbearia no casa360
    expect(await call({ ...sm, user_id: OWNER_PRO }, "k-barb")).toBe(401); // chave de outro app
    expect(await call({ ...sm, user_id: OWNER_PRO }, "errada")).toBe(401);
    expect(await call({ ...sm, user_id: OWNER_PRO }, null)).toBe(401);
    expect(await call({ ...sm, user_id: "nao-uuid" })).toBe(400);
  });
  it("regressão: tela TENANT e capability inexistente", async () => {
    expect(await call({ capability: "dashboard.view", user_id: OWNER_PRO, acting_as: "TENANT" })).toBe(200);
    expect(await call({ capability: "nao.existe", user_id: OWNER_PRO })).toBe(403);
  });
});
