/**
 * Rotas e páginas reais do FLEXUS | Barbearia (fonte para o validador do gate).
 * Mesma lista cadastrada no Control Center (Produtos → Telas dos SaaS).
 */
export const BARBEARIA_ROUTES = {
  Acesso: [
    "/login",
    "/sso",
    "/reset-password",
    "/aceitar-convite",
    "/cliente/oferta/:token",
    "/b/:slug",
  ],
  "Portal do cliente": [
    "/cliente/login",
    "/cliente",
    "/cliente/agendamentos",
    "/cliente/beneficios",
    "/cliente/perfil",
    "/agendar",
    "/historico",
    "/avaliacoes",
    "/fidelidade",
    "/assinaturas",
    "/campanhas",
    "/perfil",
  ],
  "Portal do profissional": [
    "/profissional",
    "/profissional/agenda",
    "/profissional/atendimentos",
    "/profissional/metas",
    "/profissional/comissoes",
    "/profissional/avaliacoes",
    "/profissional/clientes",
    "/profissional/produtos",
    "/profissional/notificacoes",
    "/profissional/perfil",
  ],
  "Painel admin": [
    "/admin/login",
    "/admin",
    "/admin/agenda",
    "/admin/recepcao",
    "/admin/pdv",
    "/admin/caixa",
    "/admin/caixa/supervisao",
    "/admin/caixa/conciliacao",
    "/admin/clientes",
    "/admin/clientes/duplicados",
    "/admin/crm-comercial",
    "/admin/servicos",
    "/admin/pacotes-vendidos",
    "/admin/estoque",
    "/admin/profissionais",
    "/admin/metas",
    "/admin/metas/planejamento",
    "/admin/financeiro",
    "/admin/dre",
    "/admin/analytics",
    "/admin/relatorios/dados-360",
    "/admin/relatorios/atendimentos",
    "/admin/relatorios/comparecimento",
    "/admin/relatorios/protecao-agenda",
    "/admin/marketing",
    "/admin/whatsapp-logs",
    "/admin/configuracoes",
    "/admin/usuarios",
    "/admin/seguranca",
    "/admin/auditoria-agendamentos",
    "/admin/agendamentos-orfaos",
    "/admin/backup",
    "/admin/backup/restore",
    "/admin/checkout-plano",
    "/admin/docs/rotas",
  ],
  "Central XFTS": [
    "/superadmin/dashboard",
    "/superadmin/tenants",
    "/superadmin/planos",
    "/superadmin/assinaturas",
    "/superadmin/usuarios",
    "/superadmin/conta",
    "/superadmin/marketing",
    "/superadmin/crm-comercial",
  ],
};

/** Rotas que só a XFTS pode acessar — devem ser negadas a qualquer tenant. */
export const INTERNAL_PREFIX = "/superadmin";

/** Rotas com parâmetro: não são testáveis diretamente no SaaS. */
export const PARAM_ROUTES = new Set(["/cliente/oferta/:token", "/b/:slug"]);

export const ALL_BARBEARIA_ROUTES = Object.values(BARBEARIA_ROUTES).flat();
