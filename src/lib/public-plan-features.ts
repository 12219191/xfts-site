/** Promessas de suporte removidas da oferta comercial até existir contrato que as sustente.
 * Não modifica os direitos técnicos (entitlements) nem os registros do Control Center. */
export function publicPlanFeatures(features: string[]): string[] {
  return features.filter((feature) => !/^suporte\s+(?:dedicado(?:\s+24\s*\/\s*7)?|24\s*\/\s*7)$/i.test(feature.trim()));
}
