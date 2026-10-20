import { describe, it, expect } from "vitest";
import { stepUpDecision, generateRecoveryCodes, hashRecoveryCode } from "../mfa-policy";

const now = Date.parse("2026-11-01T00:00:00Z");

describe("stepUpDecision", () => {
  it("suporte sem segundo fator com obrigatoriedade ligada: nega (nenhuma sessão de suporte)", () =>
    expect(stepUpDecision({ roles: ["suporte"], aal: "aal1", enforceAfter: "2026-10-30T00:00:00Z", now })).toBe("deny"));
  it("superadmin sem fator durante a migração: só avisa", () =>
    expect(stepUpDecision({ roles: ["superadmin"], aal: "aal1", enforceAfter: null, now })).toBe("warn"));
  it("prazo futuro ainda não obriga", () =>
    expect(stepUpDecision({ roles: ["suporte"], aal: "aal1", enforceAfter: "2026-12-01T00:00:00Z", now })).toBe("warn"));
  it("aal2 libera", () =>
    expect(stepUpDecision({ roles: ["suporte"], aal: "aal2", enforceAfter: "2026-10-30T00:00:00Z", now })).toBe("ok"));
  it("financeiro não é exigido", () =>
    expect(stepUpDecision({ roles: ["financeiro"], aal: "aal1", enforceAfter: "2026-10-30T00:00:00Z", now })).toBe("ok"));
});

describe("códigos de recuperação", () => {
  it("gera 10 códigos distintos", () => expect(new Set(generateRecoveryCodes()).size).toBe(10));
  it("hash não contém o código e ignora hífens/caixa", async () => {
    const h1 = await hashRecoveryCode("u", "ABCD-EFGH-JKLM");
    expect(h1).not.toContain("ABCD");
    expect(await hashRecoveryCode("u", "abcdefghjklm")).toBe(h1);
    expect(await hashRecoveryCode("outro", "ABCD-EFGH-JKLM")).not.toBe(h1);
  });
});
