import { describe, expect, it } from "vitest";
import { limitModeOf, setLimitMode, setLimitedValue } from "../entitlement-limit-mode";
import { limitOf, splitEntitlements } from "../entitlements";

describe("Control Center: modos explícitos dos limites", () => {
  it("distingue ausência, número e null sem mudar contratos existentes", () => {
    const current = { usuarios: 6, automacoes: null };
    expect(limitModeOf(current, "usuarios")).toBe("limited");
    expect(limitModeOf(current, "automacoes")).toBe("unlimited");
    expect(limitModeOf(current, "profissionais")).toBe("undefined");
  });

  it("não converte ausência em ilimitado e mantém o resolver fechado", () => {
    const changed = setLimitMode({ usuarios: null }, "usuarios", "undefined");
    expect(changed).toEqual({});
    const defs = [{ id: "1", productKey: "barbearia", key: "usuarios", label: "Usuários", kind: "limit" as const, unit: "", description: "", sortOrder: 0 }];
    const { limites } = splitEntitlements(changed, defs);
    expect(limites.usuarios).toBe(0);
    expect(limitOf({ limites } as never, "usuarios")).toBe(0);
  });

  it("preserva null legado e número existente; não altera o objeto original", () => {
    const original = { usuarios: null, unidades: 3 };
    expect(setLimitMode(original, "usuarios", "unlimited")).toEqual(original);
    expect(setLimitMode(original, "unidades", "limited")).toEqual(original);
    expect(setLimitMode(original, "usuarios", "limited")).toEqual({ usuarios: 0, unidades: 3 });
    expect(original.usuarios).toBeNull();
  });

  it("valida limites inteiros não negativos", () => {
    expect(setLimitedValue({}, "usuarios", 5)).toEqual({ usuarios: 5 });
    expect(setLimitedValue({}, "usuarios", 0)).toEqual({ usuarios: 0 });
    expect(() => setLimitedValue({}, "usuarios", -1)).toThrow();
    expect(() => setLimitedValue({}, "usuarios", 1.5)).toThrow();
    expect(() => setLimitedValue({}, "usuarios", Number.POSITIVE_INFINITY)).toThrow();
  });
});
