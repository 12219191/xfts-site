import { describe, expect, it } from "vitest";
import { includedSeatsHeading, includedSeatsLabel } from "../plan-seats-display";

describe("P1-01E: limites de assentos no comparador", () => {
  it("exibe apenas quantidades explícitas do catálogo", () => {
    expect(includedSeatsLabel({ seats: 2 }, "barbearia")).toBe("Até 2 usuários");
    expect(includedSeatsLabel({ seats: 1 }, "clinica")).toBe("Até 1 usuário");
    expect(includedSeatsLabel({ seats: 0 }, "flow")).toBe("Até 0 usuários");
  });

  it("não inventa capacidade ilimitada quando o limite é desconhecido", () => {
    expect(includedSeatsLabel(undefined, "atende")).toBe("Sob consulta");
    expect(includedSeatsLabel({ seats: undefined }, "atende")).toBe("Sob consulta");
    expect(includedSeatsLabel({ seats: null } as never, "flow")).toBe("Sob consulta");
  });

  it("usa moradores, não usuários, para Casa360", () => {
    expect(includedSeatsHeading("casa360")).toBe("Moradores inclusos");
    expect(includedSeatsLabel({ seats: 1 }, "casa360")).toBe("Até 1 morador");
    expect(includedSeatsLabel({ seats: 6 }, "casa360")).toBe("Até 6 moradores");
    expect(includedSeatsHeading("barbearia")).toBe("Usuários inclusos");
  });
  it("exibe ilimitado somente com entitlement explicitamente null", () => {
    expect(includedSeatsLabel({ seatLimit: { mode: "unlimited", source: "entitlements" } }, "crm")).toBe("Usuários ilimitados");
    expect(includedSeatsLabel({ seatLimit: { mode: "unlimited", source: "entitlements" } }, "casa360")).toBe("Moradores ilimitados");
    expect(includedSeatsLabel({ seatLimit: { mode: "undefined", source: "none" }, seats: 6 }, "crm")).toBe("Sob consulta");
  });

  it("prioriza capacidade dos entitlements sobre seats legados", () => {
    expect(includedSeatsLabel({ seats: 10, seatLimit: { mode: "limited", value: 3, source: "entitlements" } }, "crm")).toBe("Até 3 usuários");
  });

});
