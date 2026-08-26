import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasFeature,
  limitOf,
  parseEntitlements,
  splitEntitlements,
  withinLimit,
  type EntitlementDefinition,
} from "@/lib/entitlements";
import {
  setState,
  supabaseAdmin,
  type MockDefinition,
  type MockPlan,
} from "./supabase-admin-mock";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin }));

const {
  resolveEntitlements,
  resolveUserEntitlements,
  toWirePayload,
} = await import("@/lib/entitlements.server");

const DEFS: MockDefinition[] = [
  { id: "1", product_key: "casa360", key: "usuarios", label: "Moradores", kind: "limit" },
  {
    id: "2",
    product_key: "casa360",
    key: "relatorios_avancados",
    label: "Relatórios avançados",
    kind: "feature",
  },
  { id: "3", product_key: "casa360", key: "automacoes", label: "Automações", kind: "limit" },
];

const BASICO: MockPlan = {
  name: "Casa360 Básico",
  tier: "basico",
  seats: 1,
  price_lookup_key: "flexus_casa360_basico",
  annual_lookup_key: "flexus_casa360_basico_anual",
  entitlements: { usuarios: 1, relatorios_avancados: false, automacoes: 3 },
};

const PRO: MockPlan = {
  name: "Casa360 Pro",
  tier: "pro",
  seats: 6,
  price_lookup_key: "flexus_casa360_pro",
  annual_lookup_key: "flexus_casa360_pro_anual",
  entitlements: { usuarios: 6, relatorios_avancados: true, automacoes: null },
};

const future = new Date(Date.now() + 7 * 864e5).toISOString();
const past = new Date(Date.now() - 2 * 864e5).toISOString();

beforeEach(() => {
  setState({ definitions: DEFS, plans: [BASICO, PRO], subscriptions: [] });
});

describe("helpers client-safe", () => {
  const defs: EntitlementDefinition[] = [
    {
      id: "1",
      productKey: "casa360",
      key: "usuarios",
      label: "Moradores",
      kind: "limit",
      unit: "",
      description: "",
      sortOrder: 0,
    },
    {
      id: "2",
      productKey: "casa360",
      key: "relatorios_avancados",
      label: "Relatórios",
      kind: "feature",
      unit: "",
      description: "",
      sortOrder: 1,
    },
  ];

  it("normaliza o jsonb do plano ignorando valores inválidos", () => {
    expect(parseEntitlements({ a: true, b: 3, c: null, d: "x", e: NaN })).toEqual({
      a: true,
      b: 3,
      c: null,
    });
    expect(parseEntitlements(null)).toEqual({});
  });

  it("separa recursos e limites conforme as definições", () => {
    const { features, limites } = splitEntitlements(
      { usuarios: null, relatorios_avancados: true },
      defs,
    );
    expect(features).toEqual({ relatorios_avancados: true });
    expect(limites).toEqual({ usuarios: null });
  });

  it("bloqueia tudo (fail-closed) sem entitlements resolvidos", () => {
    expect(hasFeature(null, "relatorios_avancados")).toBe(false);
    expect(limitOf(undefined, "usuarios")).toBe(0);
    expect(withinLimit(null, "usuarios", 0)).toBe(false);
  });
});

describe("troca de plano", () => {
  it("upgrade básico → pro libera recurso e torna o limite ilimitado", async () => {
    const basico = await resolveEntitlements({
      priceId: "flexus_casa360_basico",
      status: "active",
      currentPeriodEnd: future,
    });
    expect(basico.productKey).toBe("casa360");
    expect(basico.planoNome).toBe("Casa360 Básico");
    expect(basico.features["relatorios_avancados"]).toBe(false);
    expect(basico.limites["usuarios"]).toBe(1);
    expect(basico.limites["automacoes"]).toBe(3);

    const pro = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "active",
      currentPeriodEnd: future,
    });
    expect(pro.features["relatorios_avancados"]).toBe(true);
    expect(pro.limites["usuarios"]).toBe(6);
    expect(pro.limites["automacoes"]).toBeNull();
    expect(withinLimit(pro, "automacoes", 999)).toBe(true);
  });

  it("plano anual resolve os mesmos entitlements do mensal", async () => {
    const anual = await resolveEntitlements({
      priceId: "flexus_casa360_pro_anual",
      status: "active",
      currentPeriodEnd: future,
    });
    expect(anual.planoNome).toBe("Casa360 Pro");
    expect(anual.features["relatorios_avancados"]).toBe(true);
  });

  it("downgrade pro → básico volta a bloquear o recurso", async () => {
    const basico = await resolveEntitlements({
      priceId: "flexus_casa360_basico",
      status: "active",
      currentPeriodEnd: future,
    });
    expect(hasFeature(basico, "relatorios_avancados")).toBe(false);
    expect(withinLimit(basico, "usuarios", 1)).toBe(false);
  });

  it("override manual de assentos vence o plano", async () => {
    const ent = await resolveEntitlements({
      priceId: "flexus_casa360_basico",
      status: "active",
      currentPeriodEnd: future,
      seatsOverride: 25,
    });
    expect(ent.limites["usuarios"]).toBe(25);
  });

  it("sem entitlement de usuários no catálogo usa o padrão do plano", async () => {
    setState({
      definitions: DEFS,
      plans: [{ ...PRO, entitlements: { relatorios_avancados: true } }],
      subscriptions: [],
    });
    const ent = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "active",
      currentPeriodEnd: future,
    });
    expect(ent.limites["usuarios"]).toBe(6);
  });
});

describe("expiração e suspensão", () => {
  it("período encerrado bloqueia tudo mesmo com status ativo", async () => {
    const ent = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "active",
      currentPeriodEnd: past,
    });
    expect(ent.ativo).toBe(false);
    expect(ent.features["relatorios_avancados"]).toBe(false);
    expect(ent.limites["usuarios"]).toBe(0);
    expect(ent.limites["automacoes"]).toBe(0);
    expect(hasFeature(ent, "relatorios_avancados")).toBe(false);
  });

  it("cancelamento agendado mantém acesso até o fim do período", async () => {
    const ent = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "canceled",
      currentPeriodEnd: future,
    });
    expect(ent.ativo).toBe(true);
    expect(ent.features["relatorios_avancados"]).toBe(true);
  });

  it("past_due mantém acesso (carência) e unpaid suspende", async () => {
    const carencia = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "past_due",
      currentPeriodEnd: future,
    });
    expect(carencia.ativo).toBe(true);

    for (const status of ["unpaid", "incomplete_expired", "paused"]) {
      const suspenso = await resolveEntitlements({
        priceId: "flexus_casa360_pro",
        status,
        currentPeriodEnd: future,
      });
      expect(suspenso.ativo, status).toBe(false);
      expect(suspenso.features["relatorios_avancados"], status).toBe(false);
      expect(suspenso.limites["usuarios"], status).toBe(0);
    }
  });

  it("sem assinatura nenhuma nada é liberado", async () => {
    const ent = await resolveEntitlements({ priceId: null, status: "none" });
    expect(ent.ativo).toBe(false);
    expect(ent.plano).toBeNull();
    expect(ent.features).toEqual({});
  });
});

describe("resolução por usuário (hub, SSO, provisionamento, API pública)", () => {
  it("pega a assinatura do produto certo entre vários sistemas", async () => {
    setState({
      definitions: DEFS,
      plans: [BASICO, PRO],
      subscriptions: [
        {
          price_id: "flexus_crm_basico",
          status: "active",
          current_period_end: future,
          seats_used: 1,
        },
        {
          price_id: "flexus_casa360_pro",
          status: "active",
          current_period_end: future,
          seats_used: 4,
        },
      ],
    });

    const ent = await resolveUserEntitlements("user-1", "casa360");
    expect(ent.productKey).toBe("casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.planoNome).toBe("Casa360 Pro");
    expect(ent.seatsUsed).toBe(4);
    expect(withinLimit(ent, "usuarios", ent.seatsUsed)).toBe(true);
  });

  it("produto não assinado devolve acesso bloqueado, com definições para exibição", async () => {
    setState({
      definitions: DEFS,
      plans: [BASICO, PRO],
      subscriptions: [
        { price_id: "flexus_crm_basico", status: "active", current_period_end: future },
      ],
    });

    const ent = await resolveUserEntitlements("user-1", "casa360");
    expect(ent.ativo).toBe(false);
    expect(ent.seatsUsed).toBe(0);
    expect(ent.definicoes.length).toBe(DEFS.length);
    expect(hasFeature(ent, "relatorios_avancados")).toBe(false);
  });

  it("assinatura expirada do produto suspende os entitlements do usuário", async () => {
    setState({
      definitions: DEFS,
      plans: [BASICO, PRO],
      subscriptions: [
        {
          price_id: "flexus_casa360_pro",
          status: "unpaid",
          current_period_end: past,
          seats_used: 4,
        },
      ],
    });

    const ent = await resolveUserEntitlements("user-1", "casa360");
    expect(ent.ativo).toBe(false);
    expect(ent.limites["usuarios"]).toBe(0);
  });

  it("payload enviado aos sistemas FLEXUS carrega recursos e limites efetivos", async () => {
    const ativo = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "active",
      currentPeriodEnd: future,
    });
    expect(toWirePayload(ativo)).toEqual({
      recursos: { relatorios_avancados: true },
      limites: { usuarios: 6, automacoes: null },
    });

    const suspenso = await resolveEntitlements({
      priceId: "flexus_casa360_pro",
      status: "unpaid",
      currentPeriodEnd: future,
    });
    expect(toWirePayload(suspenso)).toEqual({
      recursos: { relatorios_avancados: false },
      limites: { usuarios: 0, automacoes: 0 },
    });
  });
});
