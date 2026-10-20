/** Recursos do Flow que ainda não existem no sistema: exibidos com "(em desenvolvimento)". */
const DEV_RE = /(campanha|agentes? de ia|api p[úu]blica|webhooks? de sa[íi]da|whatsapp|instagram|facebook)/i;
export const DEV_SUFFIX = " (em desenvolvimento)";

export function markFlowDev(text: string): string {
  return DEV_RE.test(text) && !text.includes(DEV_SUFFIX.trim()) ? text + DEV_SUFFIX : text;
}

export function markFlowPlans<T extends { features: string[] }>(plans: T[]): T[] {
  return plans.map((p) => ({ ...p, features: p.features.map(markFlowDev) }));
}
