import type { ProductPlan } from "@/lib/product-plans";

export type CompareColumn = "basico" | "pro" | "enterprise";
export type CatalogComparisonFeature = {
  name: string;
  basico: boolean;
  pro: boolean;
  enterprise: boolean;
};

const COLS: CompareColumn[] = ["basico", "pro", "enterprise"];

/** O texto livre dos recursos é administrado no Control Center.
 * Não inferimos disponibilidade a partir de uma matriz comercial estática. */
export function catalogComparisonFeatures(
  plans: Partial<Record<CompareColumn, ProductPlan | undefined>>,
): CatalogComparisonFeature[] {
  const featureSets = {} as Record<CompareColumn, Set<string>>;
  const canonical = new Map<string, string>();

  for (const [index, col] of COLS.entries()) {
    const features = plans[col]?.features ?? [];
    const inherited = features.some((raw) => /^tudo do\s+/i.test(raw.trim()));
    // "Tudo do Básico" / "Tudo do Pro" no catálogo indica herança do plano anterior.
    const prev = index > 0 ? featureSets[COLS[index - 1]] : null;
    const current = new Set<string>(inherited && prev ? prev : []);

    for (const raw of features) {
      const name = raw.trim();
      if (!name || /^tudo do\s+/i.test(name)) continue;
      const key = name.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
      current.add(key);
      if (!canonical.has(key)) canonical.set(key, name);
    }
    featureSets[col] = current;
  }

  return [...canonical].map(([key, name]) => ({
    name,
    basico: featureSets.basico.has(key),
    pro: featureSets.pro.has(key),
    enterprise: featureSets.enterprise.has(key),
  }));
}
