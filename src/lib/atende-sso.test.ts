import { describe, expect, it } from "vitest";
import { atendePurposeAllowed, resolveAtendeSubscription, type AtendeSubRow } from "./atende-sso";
import { appKeyFromPriceId, getFlexusApp } from "./flexus-apps";
import { appApiKey } from "./sso.server";

const isAtende = (p: string) => appKeyFromPriceId(p) === "atende";
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const row = (o: Partial<AtendeSubRow>): AtendeSubRow => ({
  price_id: "flexus_atende_x",
  status: "active",
  current_period_end: future,
  environment: "live",
  ...o,
});

describe("Atende: registro", () => {
  it("está no allowlist com chave própria", () => {
    const app = getFlexusApp("atende");
    expect(app?.url).toBe("https://xfts-flexus10.com");
    expect(app?.provisionUrl).toBe("https://xfts-flexus10.com/api/public/provision");
    expect(app?.pricePrefix).toBe("flexus_atende");
    process.env["FLEXUS_APP_KEY_ATENDE"] = "k-at";
    process.env["FLEXUS_APP_KEY_BARBEARIA"] = "k-barb";
    expect(appApiKey("atende")).toBe("k-at");
    expect(appApiKey("atende")).not.toBe(appApiKey("barbearia"));
    delete process.env["FLEXUS_APP_KEY_ATENDE"];
    expect(appApiKey("atende")).toBeUndefined();
  });
});

describe("Atende: purpose", () => {
  it("aceita owner e legado sem purpose", () => {
    expect(atendePurposeAllowed("owner", "owner")).toBe(true);
    expect(atendePurposeAllowed(undefined, "owner")).toBe(true);
    expect(atendePurposeAllowed(undefined, null)).toBe(true);
  });
  it("recusa support no token ou no registro (tokens já emitidos)", () => {
    expect(atendePurposeAllowed("support", "support")).toBe(false);
    expect(atendePurposeAllowed("owner", "support")).toBe(false);
    expect(atendePurposeAllowed(undefined, "support")).toBe(false);
    expect(atendePurposeAllowed("support", "owner")).toBe(false);
    expect(atendePurposeAllowed("admin", "owner")).toBe(false);
  });
});

describe("Atende: seleção da assinatura", () => {
  it("live ativa → ok live", () => {
    const r = resolveAtendeSubscription([row({})], "live", isAtende);
    expect(r).toMatchObject({ kind: "ok", environment: "live" });
  });
  it("sandbox nunca libera live", () => {
    expect(resolveAtendeSubscription([row({ environment: "sandbox" })], "live", isAtende).kind).toBe("none");
    expect(
      resolveAtendeSubscription([row({ environment: "sandbox", is_courtesy: true })], "live", isAtende).kind,
    ).toBe("none");
  });
  it("live não libera sandbox", () => {
    expect(resolveAtendeSubscription([row({})], "sandbox", isAtende).kind).toBe("none");
  });
  it("ignora outros produtos e linhas expiradas/inativas", () => {
    const rows = [
      row({ price_id: "flexus_crm_pro_mensal" }),
      row({ current_period_end: past }),
      row({ status: "unpaid" }),
    ];
    expect(resolveAtendeSubscription(rows, "live", isAtende).kind).toBe("none");
  });
  it("uma ativa + uma inativa → escolhe a ativa, não a mais recente", () => {
    const r = resolveAtendeSubscription(
      [row({ status: "unpaid", price_id: "flexus_atende_new" }), row({ price_id: "flexus_atende_old" })],
      "live",
      isAtende,
    );
    expect(r.kind === "ok" && r.sub.price_id).toBe("flexus_atende_old");
  });
  it("duas ativas no mesmo ambiente → ambíguo (nega)", () => {
    const r = resolveAtendeSubscription([row({}), row({ is_courtesy: true })], "live", isAtende);
    expect(r).toEqual({ kind: "ambiguous", count: 2 });
  });
});
