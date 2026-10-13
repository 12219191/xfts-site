/**
 * Tipos e valores padrão da integração de leads com o FLEXUS | CRM.
 * Módulo client-safe: usado tanto pelo painel /admin quanto pelo servidor.
 */

export type CrmAuthMode = "hmac" | "bearer" | "api_key" | "none";

/** Formato da assinatura HMAC enviada no header. */
export type CrmSignatureEncoding = "hex" | "base64url";

export const CRM_SIGNATURE_ENCODING_OPTIONS: { id: CrmSignatureEncoding; label: string }[] = [
  { id: "hex", label: "Hexadecimal (padrão do CRM)" },
  { id: "base64url", label: "Base64 URL-safe" },
];

/** Campos internos disponíveis para mapeamento no payload enviado ao CRM. */
export const CRM_SOURCE_FIELDS = [
  { id: "reference_id", label: "Protocolo" },
  { id: "form_type", label: "Tipo de formulário" },
  { id: "nome", label: "Nome" },
  { id: "email", label: "E-mail" },
  { id: "telefone", label: "Telefone" },
  { id: "empresa", label: "Empresa" },
  { id: "segmento", label: "Segmento" },
  { id: "assunto", label: "Assunto" },
  { id: "mensagem", label: "Mensagem" },
  { id: "tela", label: "Página do formulário" },
  { id: "cta_id", label: "ID do botão" },
  { id: "cta_label", label: "Nome do botão" },
  { id: "cta_page", label: "Página do clique" },
  { id: "cta_placement", label: "Tipo de clique" },
  { id: "utm_source", label: "UTM source" },
  { id: "utm_medium", label: "UTM medium" },
  { id: "utm_campaign", label: "UTM campaign" },
  { id: "utm_term", label: "UTM term" },
  { id: "utm_content", label: "UTM content" },
  { id: "gclid", label: "gclid" },
  { id: "gbraid", label: "gbraid" },
  { id: "wbraid", label: "wbraid" },
  { id: "fbclid", label: "fbclid" },
  { id: "li_fat_id", label: "li_fat_id (LinkedIn)" },
  { id: "fbc", label: "fbc (cookie Meta)" },
  { id: "fbp", label: "fbp (cookie Meta)" },
  { id: "referrer", label: "Referrer" },
  { id: "landing_page", label: "Landing page" },
] as const;

export type CrmFieldMap = Record<string, string>;

export interface CrmIntegrationSettings {
  /** Liga/desliga o envio automático de leads. */
  enabled: boolean;
  /** URL completa do endpoint de leads do CRM. */
  lead_url: string;
  /** Como autenticar a chamada. */
  auth_mode: CrmAuthMode;
  /** Header da assinatura HMAC (modo hmac). */
  signature_header: string;
  /** Formato da assinatura HMAC (modo hmac). */
  signature_encoding: CrmSignatureEncoding;
  /** Header usado nos modos bearer/api_key. */
  auth_header: string;
  /**
   * Segredo usado na autenticação. Vazio no modo hmac = usa a chave
   * FLEXUS_APP_KEY_CRM já configurada no servidor.
   */
  auth_token: string;
  /** Formulários que viram lead. */
  form_types: string[];
  /** Timeout da chamada em milissegundos. */
  timeout_ms: number;
  /** Rótulo enviado no campo `origem`. */
  origem: string;
  /** Mapeamento campo interno → nome do campo no CRM. */
  field_map: CrmFieldMap;
  /** Caminho no JSON de resposta que contém o id do lead. */
  response_lead_id_path: string;
  /** Caminho no JSON de resposta que informa created/updated. */
  response_action_path: string;
}

export const DEFAULT_CRM_SETTINGS: CrmIntegrationSettings = {
  enabled: true,
  lead_url: "",
  auth_mode: "hmac",
  signature_header: "x-flexus-signature",
  signature_encoding: "hex",
  auth_header: "Authorization",
  auth_token: "",
  form_types: ["contato", "demo"],
  timeout_ms: 10_000,
  origem: "site-xfts",
  field_map: {},
  response_lead_id_path: "lead_id",
  response_action_path: "action",
};

export const CRM_FORM_TYPE_OPTIONS = [
  { id: "contato", label: "Contato" },
  { id: "demo", label: "Solicitação de demonstração" },
  { id: "exclusao_dados", label: "Exclusão de dados" },
] as const;

export const CRM_AUTH_MODE_OPTIONS: { id: CrmAuthMode; label: string; hint: string }[] = [
  { id: "hmac", label: "Assinatura HMAC", hint: "Assina o corpo com a chave do CRM (recomendado)." },
  { id: "bearer", label: "Bearer token", hint: "Envia `Authorization: Bearer <token>`." },
  { id: "api_key", label: "Chave em header", hint: "Envia o token puro no header escolhido." },
  { id: "none", label: "Sem autenticação", hint: "Use apenas em testes." },
];

/** Normaliza qualquer objeto salvo no banco para a configuração completa. */
export function normalizeCrmSettings(raw: unknown): CrmIntegrationSettings {
  const v = (raw ?? {}) as Partial<CrmIntegrationSettings>;
  const map = typeof v.field_map === "object" && v.field_map ? v.field_map : {};
  const cleanMap: CrmFieldMap = {};
  for (const [k, val] of Object.entries(map)) {
    if (typeof val === "string" && val.trim()) cleanMap[k] = val.trim();
  }
  const mode = ["hmac", "bearer", "api_key", "none"].includes(String(v.auth_mode))
    ? (v.auth_mode as CrmAuthMode)
    : DEFAULT_CRM_SETTINGS.auth_mode;

  return {
    enabled: v.enabled !== false,
    lead_url: typeof v.lead_url === "string" ? v.lead_url.trim() : DEFAULT_CRM_SETTINGS.lead_url,
    auth_mode: mode,
    signature_header:
      (typeof v.signature_header === "string" && v.signature_header.trim()) ||
      DEFAULT_CRM_SETTINGS.signature_header,
    signature_encoding: v.signature_encoding === "base64url" ? "base64url" : "hex",
    auth_header:
      (typeof v.auth_header === "string" && v.auth_header.trim()) || DEFAULT_CRM_SETTINGS.auth_header,
    auth_token: typeof v.auth_token === "string" ? v.auth_token : "",
    form_types:
      Array.isArray(v.form_types) && v.form_types.length
        ? v.form_types.filter((t): t is string => typeof t === "string")
        : DEFAULT_CRM_SETTINGS.form_types,
    timeout_ms:
      typeof v.timeout_ms === "number" && v.timeout_ms >= 1000 && v.timeout_ms <= 30_000
        ? v.timeout_ms
        : DEFAULT_CRM_SETTINGS.timeout_ms,
    origem: (typeof v.origem === "string" && v.origem.trim()) || DEFAULT_CRM_SETTINGS.origem,
    field_map: cleanMap,
    response_lead_id_path:
      (typeof v.response_lead_id_path === "string" && v.response_lead_id_path.trim()) ||
      DEFAULT_CRM_SETTINGS.response_lead_id_path,
    response_action_path:
      (typeof v.response_action_path === "string" && v.response_action_path.trim()) ||
      DEFAULT_CRM_SETTINGS.response_action_path,
  };
}
