import { describe, expect, it } from "vitest";
import { publicSeatLimit, seatLimitConflict } from "../public-seat-limit";

describe("P1-02: origem explícita do limite de usuários/moradores", () => {
  it("usa entitlement numérico como fonte prioritária", () => {
    expect(publicSeatLimit({ seats: 6, entitlements: { usuarios: 3 } })).toEqual({
      mode: "limited", value: 3, source: "entitlements",
    });
    expect(seatLimitConflict({ seats: 6, entitlements: { usuarios: 3 } })).toBe(true);
  });

  it("reconhece ilimitado somente quando explicitamente registrado no entitlement", () => {
    expect(publicSeatLimit({ seats: null, entitlements: { usuarios: null } })).toEqual({
      mode: "unlimited", source: "entitlements",
    });
    expect(publicSeatLimit({ seats: 6, entitlements: { usuarios: null } })).toEqual({
      mode: "unlimited", source: "entitlements",
    });
    expect(seatLimitConflict({ seats: 6, entitlements: { usuarios: null } })).toBe(true);
  });

  it("não infere ilimitado a partir de seats=null sem entitlement", () => {
    expect(publicSeatLimit({ seats: null, entitlements: {} })).toEqual({ mode: "undefined", source: "none" });
    expect(publicSeatLimit({ seats: 5, entitlements: {} })).toEqual({
      mode: "limited", value: 5, source: "seats",
    });
  });

  it("um entitlement explícito inválido não é substituído por fallback de tier", () => {
    expect(publicSeatLimit({ seats: 5, entitlements: { usuarios: true } })).toEqual({
      mode: "undefined", source: "none",
    });
  });

  it("preserva quantidade zero e não muda os registros de entrada", () => {
    const plan = { seats: 0, entitlements: { usuarios: 0 } };
    expect(publicSeatLimit(plan)).toEqual({ mode: "limited", value: 0, source: "entitlements" });
    expect(plan).toEqual({ seats: 0, entitlements: { usuarios: 0 } });
  });
});
