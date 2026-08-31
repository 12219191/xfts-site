/** Tradução dos registros de auditoria para leitura humana (client-safe). */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "entitlement.seats_override": "Ajuste de limite de usuários",
  "support.impersonation": "Acesso de suporte ao sistema",
  "cortesia.concedida": "Cortesia concedida",
  "cortesia.encerrada": "Cortesia encerrada",
  "integracao.crm": "Configuração da integração com o CRM",
  "atribuicao.janela": "Janela de atribuição de leads",
  "team.role_granted": "Papel de administrador concedido",
  "team.role_revoked": "Papel de administrador removido",
  "convite.cancelado": "Convite de equipe cancelado",
};

const FIELD_LABELS: Record<string, string> = {
  limite_usuarios: "Limite de usuários",
  seats: "Usuários",
  window_days: "Janela (dias)",
  app: "Sistema",
  cliente: "Cliente",
  plano: "Plano",
  dias: "Validade (dias)",
  enabled: "Ativa",
  lead_url: "URL do CRM",
  auth_mode: "Autenticação",
  signature_encoding: "Codificação da assinatura",
  form_types: "Formulários enviados",
  origem: "Origem",
  timeout_ms: "Tempo limite (ms)",
  ok: "Concluído",
  status: "Status",
  role: "Papel",
};

export interface AuditChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

export const auditActionLabel = (action: string) => AUDIT_ACTION_LABELS[action] ?? action;

const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key.replace(/_/g, " ");

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** Diferenças campo a campo entre o estado anterior e o posterior. */
export function diffAuditFields(before: unknown, after: unknown): AuditChange[] {
  const a = asRecord(before);
  const b = asRecord(after);
  if (!a && !b) return [];

  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])];
  const changes: AuditChange[] = [];
  for (const key of keys) {
    const beforeValue = a ? formatAuditValue(a[key]) : null;
    const afterValue = b ? formatAuditValue(b[key]) : null;
    if (beforeValue === afterValue) continue;
    changes.push({ field: key, label: fieldLabel(key), before: beforeValue, after: afterValue });
  }
  return changes;
}
