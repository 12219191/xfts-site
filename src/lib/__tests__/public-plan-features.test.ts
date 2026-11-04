import { describe, expect, it } from "vitest";
import { publicPlanFeatures } from "../public-plan-features";

describe("P1-01E: não prometer atendimento que a XFTS não oferece", () => {
  it("oculta exclusivamente alegações de suporte dedicado e 24/7", () => {
    expect(publicPlanFeatures([
      "Agendamento online",
      "Suporte dedicado 24/7",
      "Suporte dedicado",
      "Suporte 24/7",
      "Suporte por e-mail",
      "Relatórios gerenciais",
    ])).toEqual(["Agendamento online", "Suporte por e-mail", "Relatórios gerenciais"]);
  });

  it("não altera a lista de entrada nem os recursos técnicos", () => {
    const features = ["Atendimento por WhatsApp", "Suporte dedicado 24/7"];
    expect(publicPlanFeatures(features)).toEqual(["Atendimento por WhatsApp"]);
    expect(features).toHaveLength(2);
  });
});
