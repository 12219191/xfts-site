import { describe, expect, it } from "vitest";
import { planComparisonFaqs } from "../commercial-faq";

describe("P1-01B e P1-01C: promessas comerciais no comparador", () => {
  const answer = (question: string) => planComparisonFaqs.find((faq) => faq.q === question);

  it("distingue upgrade imediato de downgrade na renovação", () => {
    const faq = answer("Posso trocar de plano a qualquer momento?");
    expect(faq?.a).toContain("upgrade é aplicado imediatamente");
    expect(faq?.a).toContain("cobrança proporcional");
    expect(faq?.a).toContain("downgrade é agendado para a próxima renovação");
    expect(faq?.a).toContain("sem crédito ou reembolso proporcional");
  });

  it("não promete retenção universal de 90 dias e encaminha às políticas", () => {
    const faq = answer("O que acontece com meus dados se eu cancelar?");
    expect(faq?.a).not.toMatch(/armazenados.*90 dias/i);
    expect(faq?.a).toContain("não há um prazo único de 90 dias");
    expect(faq && "links" in faq ? faq.links.map((link) => link.href) : []).toEqual([
      "/politica-de-privacidade", "/exclusao-de-dados",
    ]);
  });
});
