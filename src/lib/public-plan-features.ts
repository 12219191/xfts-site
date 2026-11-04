/** Condição comercial de suporte confirmada pela XFTS.
 * Apresentação pública somente; não altera entitlements ou registros do Control Center. */
export const PUBLIC_SUPPORT_LABEL = "Suporte via WhatsApp em horário comercial";

/** Padroniza toda promessa de suporte por plano, sem anunciar 24/7,
 * atendimento dedicado, prioritário ou por e-mail não confirmados. */
export function publicPlanFeatures(features: string[]): string[] {
  const result = features.filter((feature) => !/^suporte\b/i.test(feature.trim()));
  result.push(PUBLIC_SUPPORT_LABEL);
  return result;
}
