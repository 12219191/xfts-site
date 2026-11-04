import { describe, expect, it } from "vitest";
import { getTrialMessage } from "../trial-messaging";

describe("mensagens de trial no catálogo público", () => {
  const plan = (days: number, priceId = "stripe_lookup") => ({ trialDays: days, priceId });

  it("anuncia a duração e a regra de cancelamento quando todos os planos são elegíveis", () => {
    const result = getTrialMessage([plan(7), plan(7)]);
    expect(result?.heading).toBe("7 dias grátis para testar");
    expect(result?.detail).toContain("antes do fim do teste");
    expect(result?.footnote).toContain("custos adicionais");
  });

  it("não promete trial universal se os planos diferem", () => {
    const result = getTrialMessage([plan(7), plan(0), plan(14)]);
    expect(result?.heading).toBe("Teste gratuito nos planos elegíveis");
    expect(result?.detail).toContain("varia conforme o plano");
  });

  it("não anuncia trial quando não há configuração válida ou produto está indisponível", () => {
    expect(getTrialMessage([])).toBeNull();
    expect(getTrialMessage([plan(0)])).toBeNull();
    expect(getTrialMessage([plan(7)], false)).toBeNull();
    expect(getTrialMessage([plan(7, "")])).toBeNull();
  });
});
