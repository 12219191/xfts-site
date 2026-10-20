/**
 * Liberação temporária do "Acessar Sistema" do Flow enquanto ele está "Em breve":
 * só para administradores do Control Center e só com a flag ligada.
 * Desfazer: integration_settings "flow.admin_preview_access" = false.
 */
export const FLOW_ADMIN_PREVIEW_FLAG = "flow.admin_preview_access";

export function flowAdminPreviewAllowed(input: {
  appKey: string;
  productAccessible: boolean;
  flagOn: boolean;
  isAdmin: boolean;
}): boolean {
  return input.appKey === "flow" && !input.productAccessible && input.flagOn && input.isAdmin;
}
