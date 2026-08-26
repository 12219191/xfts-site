/**
 * Entitlements: o que cada plano libera (recursos) e até onde vai (limites).
 * Este arquivo é client-safe — tipos e helpers de apresentação/checagem.
 */

export type EntitlementKind = "feature" | "limit";

export interface EntitlementDefinition {
  id: string;
  productKey: string;
  key: string;
  label: string;
  kind: EntitlementKind;
  unit: string;
  description: string;
  sortOrder: number;
}

/** Valor por plano: boolean (recurso) ou número/null=ilimitado (limite). */
export type EntitlementValue = boolean | number | null;

export type EntitlementMap = Record<string, EntitlementValue>;

/** Entitlements efetivos do usuário em um produto. */
export interface ResolvedEntitlements {
  productKey: string;
  ativo: boolean;
  status: string;
  plano: string | null;
  planoNome: string | null;
  /** Recursos booleanos liberados. */
  features: Record<string, boolean>;
  /** Limites numéricos (null = ilimitado). */
  limites: Record<string, number | null>;
  /** Definições para exibir rótulos/unidades. */
  definicoes: EntitlementDefinition[];
}

export const EMPTY_ENTITLEMENTS: ResolvedEntitlements = {
  productKey: "",
  ativo: false,
  status: "none",
  plano: null,
  planoNome: null,
  features: {},
  limites: {},
  definicoes: [],
};

/** O recurso está liberado para o usuário? Sem assinatura ativa, nunca. */
export function hasFeature(
  ent: ResolvedEntitlements | null | undefined,
  key: string,
): boolean {
  if (!ent || !ent.ativo) return false;
  return ent.features[key] === true;
}

/** Limite do plano: número, ou null quando ilimitado. Sem acesso => 0. */
export function limitOf(
  ent: ResolvedEntitlements | null | undefined,
  key: string,
): number | null {
  if (!ent || !ent.ativo) return 0;
  const value = ent.limites[key];
  return value === undefined ? 0 : value;
}

/** O uso atual ainda cabe no limite do plano? */
export function withinLimit(
  ent: ResolvedEntitlements | null | undefined,
  key: string,
  used: number,
): boolean {
  const limit = limitOf(ent, key);
  if (limit === null) return true;
  return used < limit;
}

export function formatLimit(value: number | null, unit = ""): string {
  if (value === null) return "Ilimitado";
  return unit ? `${value} ${unit}` : String(value);
}

export function formatEntitlementValue(
  def: EntitlementDefinition,
  value: EntitlementValue | undefined,
): string {
  if (def.kind === "feature") return value === true ? "Incluído" : "Não incluído";
  if (value === null) return "Ilimitado";
  if (typeof value === "number") return formatLimit(value, def.unit);
  return "—";
}

/** Normaliza o jsonb salvo no plano para um mapa tipado. */
export function parseEntitlements(raw: unknown): EntitlementMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: EntitlementMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "boolean" || value === null) out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/** Separa o mapa do plano em recursos e limites, conforme as definições. */
export function splitEntitlements(
  map: EntitlementMap,
  definitions: EntitlementDefinition[],
): { features: Record<string, boolean>; limites: Record<string, number | null> } {
  const features: Record<string, boolean> = {};
  const limites: Record<string, number | null> = {};
  for (const def of definitions) {
    const value = map[def.key];
    if (def.kind === "feature") features[def.key] = value === true;
    else limites[def.key] = value === null ? null : typeof value === "number" ? value : 0;
  }
  return { features, limites };
}
