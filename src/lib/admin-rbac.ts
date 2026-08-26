/**
 * Papéis e permissões do Control Center (client-safe).
 * A verificação real acontece sempre no servidor; aqui é só navegação/UI.
 */

export type AdminRole = "superadmin" | "financeiro" | "comercial" | "suporte" | "produto";

export const ADMIN_ROLES: AdminRole[] = [
  "superadmin",
  "financeiro",
  "comercial",
  "suporte",
  "produto",
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Superadmin",
  financeiro: "Financeiro",
  comercial: "Comercial",
  suporte: "Suporte",
  produto: "Produto",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  superadmin: "Acesso total, inclusive equipe e integrações",
  financeiro: "Assinaturas, cobrança, cortesias e visão executiva",
  comercial: "Clientes, assinaturas, leads e visão executiva",
  suporte: "Clientes, entitlements e acesso de suporte",
  produto: "Produtos, imagens e conteúdo do blog",
};

export type AdminModule =
  | "dashboard"
  | "clientes"
  | "assinaturas"
  | "cobranca"
  | "financeiro"
  | "cortesias"
  | "produtos"
  | "conteudo"
  | "leads"
  | "integracoes"
  | "equipe"
  | "auditoria";

/** Quais papéis podem abrir cada módulo. Superadmin tem tudo. */
export const MODULE_ROLES: Record<AdminModule, AdminRole[]> = {
  dashboard: ["superadmin", "financeiro", "comercial", "suporte", "produto"],
  clientes: ["superadmin", "comercial", "suporte"],
  assinaturas: ["superadmin", "financeiro", "comercial"],
  cobranca: ["superadmin", "financeiro"],
  financeiro: ["superadmin", "financeiro"],
  cortesias: ["superadmin", "financeiro", "suporte"],
  produtos: ["superadmin", "produto"],
  conteudo: ["superadmin", "produto"],
  leads: ["superadmin", "comercial"],
  integracoes: ["superadmin"],
  equipe: ["superadmin"],
  auditoria: ["superadmin", "financeiro"],
};

export function canAccess(roles: AdminRole[], module: AdminModule): boolean {
  if (roles.includes("superadmin")) return true;
  return MODULE_ROLES[module].some((r) => roles.includes(r));
}
