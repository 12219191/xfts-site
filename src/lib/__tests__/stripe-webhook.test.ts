/**
 * Testes integrados dos eventos do Stripe: garantem que invoice.paid,
 * customer.subscription.updated e customer.subscription.deleted atualizam a
 * assinatura, a trilha de eventos, o provisionamento e — principalmente — os
 * entitlements e o acesso efetivo do usuário.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, mockClient, resetDb, type Row } from "./webhook-db-mock";

vi.mock("@supabase/supabase-js", () => ({ createClient: () => mockClient }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mockClient }));

const provisionApp = vi.fn(async () => ({ ok: true, app: "casa360" as string | null }));
vi.mock("@/lib/provisioning.server", () => ({ provisionApp: (...a: unknown[]) => provisionApp(...(a as [])) }));

const openDunning = vi.fn(async () => {});
const resolveDunning = vi.fn(async () => {});
vi.mock("@/lib/dunning.server", () => ({
  openDunning: (...a: unknown[]) => openDunning(...(a as [])),
  resolveDunning: (...a: unknown[]) => resolveDunning(...(a as [])),
}));

const { handleStripeEvent } = await import("@/lib/payments-webhook.server");
const { resolveUserEntitlements } = await import("@/lib/entitlements.server");

const USER = "11111111-1111-1111-1111-111111111111";
const SUB_ID = "sub_casa360_1";
const PRO = "flexus_casa360_pro";
const BASICO = "flexus_casa360_basico";

const DEFINITIONS: Row[] = [
  { id: "1", product_key: "casa360", key: "usuarios", label: "Moradores", kind: "limit", sort_order: 0 },
  {
    id: "2",
    product_key: "casa360",
    key: "relatorios_avancados",
    label: "Relatórios avançados",
    kind: "feature",
    sort_order: 1,
  },
];

const PLANS: Row[] = [
  {
    name: "Casa360 Básico",
    tier: "basico",
    seats: 1,
    price_lookup_key: BASICO,
    annual_lookup_key: `${BASICO}_anual`,
    entitlements: { usuarios: 1, relatorios_avancados: false },
  },
  {
    name: "Casa360 Pro",
    tier: "pro",
    seats: 6,
    price_lookup_key: PRO,
    annual_lookup_key: `${PRO}_anual`,
    entitlements: { usuarios: 6, relatorios_avancados: true },
  },
];

const future = () => Math.floor((Date.now() + 30 * 24 * 3600 * 1000) / 1000);

function subscriptionRow(overrides: Row = {}): Row {
  return {
    user_id: USER,
    stripe_subscription_id: SUB_ID,
    stripe_customer_id: "cus_1",
    price_id: PRO,
    status: "active",
    current_period_end: new Date(future() * 1000).toISOString(),
    cancel_at_period_end: false,
    environment: "sandbox",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function stripeSubscription(priceId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: SUB_ID,
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { userId: USER },
    items: {
      data: [
        {
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: future(),
          price: { lookup_key: priceId, product: "prod_1" },
        },
      ],
    },
    ...overrides,
  };
}

const event = (type: string, object: unknown) => ({ id: `evt_${type}`, type, data: { object } });

function events(type: string) {
  return db.subscription_events.filter((e) => e["event_type"] === type);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDb({
    entitlement_definitions: DEFINITIONS,
    catalog_plans: PLANS,
    subscriptions: [subscriptionRow()],
  });
});

describe("customer.subscription.updated", () => {
  it("aplica downgrade: assinatura, trilha e entitlements do novo plano", async () => {
    await handleStripeEvent(event("customer.subscription.updated", stripeSubscription(BASICO)), "sandbox");

    expect(db.subscriptions[0]!["price_id"]).toBe(BASICO);
    expect(events("plano_alterado")).toHaveLength(1);

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.limites["usuarios"]).toBe(1);
    expect(ent.features["relatorios_avancados"]).toBe(false);
    expect(provisionApp).toHaveBeenCalled();
  });

  it("aplica upgrade e libera recursos do plano superior", async () => {
    resetDb({
      entitlement_definitions: DEFINITIONS,
      catalog_plans: PLANS,
      subscriptions: [subscriptionRow({ price_id: BASICO })],
    });

    await handleStripeEvent(event("customer.subscription.updated", stripeSubscription(PRO)), "sandbox");

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.limites["usuarios"]).toBe(6);
    expect(ent.features["relatorios_avancados"]).toBe(true);
  });

  it("registra cancelamento agendado mantendo acesso até o fim do período", async () => {
    await handleStripeEvent(
      event(
        "customer.subscription.updated",
        stripeSubscription(PRO, {
          cancel_at_period_end: true,
          cancellation_details: { comment: "preço" },
        }),
      ),
      "sandbox",
    );

    expect(db.subscriptions[0]!["cancel_at_period_end"]).toBe(true);
    expect(events("cancelamento_agendado")).toHaveLength(1);

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.features["relatorios_avancados"]).toBe(true);
  });

  it("suspende o acesso quando o status vira unpaid", async () => {
    await handleStripeEvent(
      event("customer.subscription.updated", stripeSubscription(PRO, { status: "unpaid" })),
      "sandbox",
    );

    expect(db.subscriptions[0]!["status"]).toBe("unpaid");
    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(false);
    expect(ent.features["relatorios_avancados"]).toBe(false);
    expect(ent.limites["usuarios"]).toBe(0);
  });

  it("mantém acesso em carência quando o status é past_due", async () => {
    await handleStripeEvent(
      event("customer.subscription.updated", stripeSubscription(PRO, { status: "past_due" })),
      "sandbox",
    );

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.limites["usuarios"]).toBe(6);
  });

  it("registra reativação quando o cancelamento agendado é revertido", async () => {
    resetDb({
      entitlement_definitions: DEFINITIONS,
      catalog_plans: PLANS,
      subscriptions: [subscriptionRow({ cancel_at_period_end: true })],
    });

    await handleStripeEvent(event("customer.subscription.updated", stripeSubscription(PRO)), "sandbox");

    expect(db.subscriptions[0]!["cancel_at_period_end"]).toBe(false);
    expect(events("assinatura_reativada")).toHaveLength(1);
  });
});

describe("customer.subscription.deleted", () => {
  it("bloqueia todos os entitlements quando o período pago acabou", async () => {
    resetDb({
      entitlement_definitions: DEFINITIONS,
      catalog_plans: PLANS,
      subscriptions: [
        subscriptionRow({
          current_period_end: new Date(Date.now() - 3600 * 1000).toISOString(),
        }),
      ],
    });

    await handleStripeEvent(
      event("customer.subscription.deleted", { id: SUB_ID, customer: "cus_1" }),
      "sandbox",
    );

    expect(db.subscriptions[0]!["status"]).toBe("canceled");
    expect(events("assinatura_encerrada")).toHaveLength(1);

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(false);
    expect(ent.features["relatorios_avancados"]).toBe(false);
    expect(ent.limites["usuarios"]).toBe(0);
  });

  it("mantém o acesso até o fim do período quando o cancelamento é no meio do ciclo", async () => {
    await handleStripeEvent(
      event("customer.subscription.deleted", { id: SUB_ID, customer: "cus_1" }),
      "sandbox",
    );

    expect(db.subscriptions[0]!["status"]).toBe("canceled");
    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.limites["usuarios"]).toBe(6);
  });


  it("avisa o sistema do produto para revogar o acesso", async () => {
    await handleStripeEvent(
      event("customer.subscription.deleted", { id: SUB_ID, customer: "cus_1" }),
      "sandbox",
    );

    expect(provisionApp).toHaveBeenCalledWith(
      expect.objectContaining({ event: "canceled", userId: USER, status: "canceled" }),
    );
  });
});

describe("invoice.paid", () => {
  it("encerra a régua de cobrança da assinatura regularizada", async () => {
    await handleStripeEvent(
      event("invoice.paid", { id: "in_1", subscription: SUB_ID, amount_due: 9900 }),
      "sandbox",
    );

    expect(resolveDunning).toHaveBeenCalledWith(SUB_ID);
  });

  it("aceita o formato novo (parent.subscription_details) do Stripe", async () => {
    await handleStripeEvent(
      event("invoice.payment_succeeded", {
        id: "in_2",
        parent: { subscription_details: { subscription: SUB_ID } },
      }),
      "sandbox",
    );

    expect(resolveDunning).toHaveBeenCalledWith(SUB_ID);
  });

  it("restaura o acesso quando o pagamento regulariza a assinatura", async () => {
    resetDb({
      entitlement_definitions: DEFINITIONS,
      catalog_plans: PLANS,
      subscriptions: [subscriptionRow({ status: "past_due" })],
    });

    // Stripe envia invoice.paid e, em seguida, subscription.updated com active.
    await handleStripeEvent(
      event("invoice.paid", { id: "in_3", subscription: SUB_ID }),
      "sandbox",
    );
    await handleStripeEvent(
      event("customer.subscription.updated", stripeSubscription(PRO, { status: "active" })),
      "sandbox",
    );

    expect(resolveDunning).toHaveBeenCalledWith(SUB_ID);
    expect(db.subscriptions[0]!["status"]).toBe("active");
    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(true);
    expect(ent.features["relatorios_avancados"]).toBe(true);
  });

  it("ignora faturas sem assinatura vinculada", async () => {
    await handleStripeEvent(event("invoice.paid", { id: "in_4" }), "sandbox");
    expect(resolveDunning).not.toHaveBeenCalled();
  });
});

describe("invoice.payment_failed", () => {
  it("abre a régua de cobrança e registra a falha sem cortar o acesso na hora", async () => {
    await handleStripeEvent(
      event("invoice.payment_failed", { id: "in_5", subscription: SUB_ID, amount_due: 9900 }),
      "sandbox",
    );

    expect(events("pagamento_falhou")).toHaveLength(1);
    expect(openDunning).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: SUB_ID, userId: USER, amountDue: 99 }),
    );

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(true);
  });
});

describe("expiração de período", () => {
  it("bloqueia o acesso quando o período pago já terminou", async () => {
    resetDb({
      entitlement_definitions: DEFINITIONS,
      catalog_plans: PLANS,
      subscriptions: [
        subscriptionRow({
          status: "canceled",
          current_period_end: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        }),
      ],
    });

    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.ativo).toBe(false);
    expect(ent.limites["usuarios"]).toBe(0);
  });
});

describe("idempotência e deduplicação", () => {
  const at = (type: string, object: unknown, id: string, created: number) => ({
    id,
    type,
    created,
    data: { object },
  });
  const now = Math.floor(Date.now() / 1000);

  it("ignora a reentrega do mesmo evento (sem duplicar trilha nem provisionamento)", async () => {
    const evt = at("customer.subscription.updated", stripeSubscription(BASICO), "evt_dup_1", now);

    await handleStripeEvent(evt, "sandbox");
    await handleStripeEvent(evt, "sandbox");

    expect(events("plano_alterado")).toHaveLength(1);
    expect(provisionApp).toHaveBeenCalledTimes(1);
    expect(db.subscriptions[0]!["price_id"]).toBe(BASICO);
  });

  it("descarta evento antigo que chega depois do mais recente", async () => {
    await handleStripeEvent(
      at("customer.subscription.updated", stripeSubscription(BASICO), "evt_novo", now),
      "sandbox",
    );
    await handleStripeEvent(
      at("customer.subscription.updated", stripeSubscription(PRO), "evt_antigo", now - 600),
      "sandbox",
    );

    expect(db.subscriptions[0]!["price_id"]).toBe(BASICO);
    const ent = await resolveUserEntitlements(USER, "casa360");
    expect(ent.limites["usuarios"]).toBe(1);
  });

  it("aceita evento posterior ao último aplicado", async () => {
    await handleStripeEvent(
      at("customer.subscription.updated", stripeSubscription(BASICO), "evt_1", now - 600),
      "sandbox",
    );
    await handleStripeEvent(
      at("customer.subscription.updated", stripeSubscription(PRO), "evt_2", now),
      "sandbox",
    );

    expect(db.subscriptions[0]!["price_id"]).toBe(PRO);
  });

  it("não reprocessa cancelamento reentregue", async () => {
    const evt = at("customer.subscription.deleted", stripeSubscription(PRO), "evt_del", now);
    await handleStripeEvent(evt, "sandbox");
    await handleStripeEvent(evt, "sandbox");

    expect(events("assinatura_encerrada")).toHaveLength(1);
    expect(db.subscriptions[0]!["status"]).toBe("canceled");
  });
});
