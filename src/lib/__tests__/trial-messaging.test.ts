import { describe, expect, it } from "vitest";
import { getTrialMessage, hasCardlessTrial, trialBadgeLabel } from "../trial-messaging";

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
  it("mostra 'sem cartão' somente quando o Control Center permite e há trial contratável", () => {
    expect(trialBadgeLabel({ trialDays: 7, priceId: "plano", trialRequireCard: false })).toBe("7 dias grátis sem cartão");
    expect(trialBadgeLabel({ trialDays: 7, priceId: "plano", trialRequireCard: true })).toBe("7 dias grátis");
    expect(trialBadgeLabel({ trialDays: 7, priceId: "plano" })).toBe("7 dias grátis");
    expect(trialBadgeLabel({ trialDays: 7, trialRequireCard: false })).toBeNull();
    expect(trialBadgeLabel({ trialDays: 0, priceId: "plano", trialRequireCard: false })).toBeNull();
    expect(hasCardlessTrial({ trialDays: 7, priceId: "plano", trialRequireCard: false })).toBe(true);
  });

  it("explica o cancelamento automático somente nos trials sem cartão", () => {
    const withoutCard = getTrialMessage([{ trialDays: 7, priceId: "plano", trialRequireCard: false }]);
    expect(withoutCard?.footnote).toContain("cancelada automaticamente");
    const withCard = getTrialMessage([{ trialDays: 7, priceId: "plano", trialRequireCard: true }]);
    expect(withCard?.footnote).not.toContain("cancelada automaticamente");
  });

  it("não promete teste sem cartão para todos os planos quando modalidades são mistas", () => {
    const result = getTrialMessage([
      { trialDays: 7, priceId: "a", trialRequireCard: false },
      { trialDays: 7, priceId: "b", trialRequireCard: true },
    ]);
    expect(result?.footnote).toContain("Alguns planos permitem começar sem cartão");
    expect(result?.footnote).toContain("consulte a condição exibida em cada plano");
  });

});
