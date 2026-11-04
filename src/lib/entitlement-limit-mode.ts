import type { EntitlementMap } from "@/lib/entitlements";

/** Contrato compatível com o JSONB legado:
 * - chave ausente: undefined (não configurado; resolver bloqueia por padrão)
 * - número inteiro >= 0: limited
 * - null explícito: unlimited (comportamento já contratado)
 * Não altera o formato transmitido aos SaaS nem os direitos existentes. */
export type LimitMode = "undefined" | "limited" | "unlimited";

export function limitModeOf(map: EntitlementMap, key: string): LimitMode {
  if (!Object.prototype.hasOwnProperty.call(map, key)) return "undefined";
  const value = map[key];
  return value === null ? "unlimited" : typeof value === "number" ? "limited" : "undefined";
}

/** Devolve um novo mapa; undefined remove a chave (não escreve null). */
export function setLimitMode(map: EntitlementMap, key: string, mode: LimitMode): EntitlementMap {
  const next = { ...map };
  if (mode === "undefined") delete next[key];
  else if (mode === "unlimited") next[key] = null;
  else {
    const value = map[key];
    next[key] = typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
  return next;
}

export function setLimitedValue(map: EntitlementMap, key: string, amount: number): EntitlementMap {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("O limite deve ser um inteiro não negativo.");
  return { ...map, [key]: amount };
}
