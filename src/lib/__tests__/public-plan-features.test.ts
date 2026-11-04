import { describe, expect, it } from "vitest";
import { PUBLIC_SUPPORT_LABEL, publicPlanFeatures } from "../public-plan-features";

describe("P1-01E: comunicar suporte confirmado pela XFTS", () => {
  it("substitui promessas de suporte não oferecido pelo canal e período confirmados", () => {
    expect(publicPlanFeatures([
      "Agendamento online",
      "Suporte dedicado 24/7",
      "Suporte dedicado",
      "Suporte 24/7",
      "Suporte prioritário",
      "Suporte por e-mail",
      "Relatórios gerenciais",
    ])).toEqual(["Agendamento online", "Relatórios gerenciais", PUBLIC_SUPPORT_LABEL]);
  });

  it("inclui o suporte confirmado quando o catálogo não lista suporte", () => {
    expect(publicPlanFeatures(["Controle financeiro"])).toEqual([
      "Controle financeiro", PUBLIC_SUPPORT_LABEL,
    ]);
  });

  it("não duplica a mensagem nem modifica os recursos técnicos ou o array original", () => {
    const features = ["Atendimento por WhatsApp", PUBLIC_SUPPORT_LABEL, "Suporte dedicado"];
    expect(publicPlanFeatures(features)).toEqual(["Atendimento por WhatsApp", PUBLIC_SUPPORT_LABEL]);
    expect(features).toHaveLength(3);
  });
});
