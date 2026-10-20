export const LEAD_SEGMENTS = [
  { value: "barbearia", label: "Barbearia" },
  { value: "estetica", label: "Estética / Salão" },
  { value: "atende", label: "Atendimento no WhatsApp (Atende)" },
  { value: "flow", label: "Automação de conversas (Flow)" },
  { value: "crm", label: "Vendas / CRM" },
  { value: "casa360", label: "Gestão da casa (Casa360°)" },
  { value: "clinica", label: "Clínica (lista de espera)" },
  { value: "aba", label: "Terapia ABA (lista de espera)" },
  { value: "outro", label: "Outro" },
] as const;

export type LeadSegment = (typeof LEAD_SEGMENTS)[number]["value"];

export function isLeadSegment(value: unknown): value is LeadSegment {
  return typeof value === "string" && LEAD_SEGMENTS.some((s) => s.value === value);
}
