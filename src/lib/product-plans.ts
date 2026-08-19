export const clinicaPlans = [
  {
    name: "Básico", price: "R$ 99", description: "Ideal para consultórios individuais", tier: "basico" as const,
    features: ["Agendamento online", "Prontuário eletrônico", "Controle financeiro", "Emissão de recibos", "1 profissional"],
    priceId: "gestao_clinica_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para clínicas com múltiplos profissionais", tier: "pro" as const,
    features: ["Tudo do Básico", "Notificações automáticas", "Relatórios avançados", "Gestão de equipe", "Até 10 profissionais"],
    priceId: "gestao_clinica_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para redes e grandes operações", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Multi-unidades", "Integração com convênios", "API e integrações", "Profissionais ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

export const barbeariasPlans = [
  {
    name: "Básico", price: "R$ 89", description: "Para barbearias individuais", tier: "basico" as const,
    features: ["PDV integrado", "Controle de estoque", "Agendamento online", "CRM de clientes", "1 profissional"],
    priceId: "gestao_barbearias_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 169", description: "Para redes e múltiplas unidades", tier: "pro" as const,
    features: ["Tudo do Básico", "Gestão de comissões", "Notificações WhatsApp", "Fidelização de clientes", "Até 10 profissionais"],
    priceId: "gestao_barbearias_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 349", description: "Para redes e grandes operações", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Multi-unidades", "Relatórios completos", "Suporte dedicado 24/7", "Profissionais ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

export const esteticasPlans = [
  {
    name: "Básico", price: "R$ 99", description: "Para studios individuais", tier: "basico" as const,
    features: ["Gestão de vendas e PDV", "Controle de estoque", "Agendamento online", "CRM de clientes", "1 profissional"],
    priceId: "gestao_esteticas_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 189", description: "Para clínicas com equipe", tier: "pro" as const,
    features: ["Tudo do Básico", "Controle de pacotes e sessões", "Gestão de comissões", "Notificações automáticas", "Até 10 profissionais"],
    priceId: "gestao_esteticas_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 379", description: "Para redes e grandes operações", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Multi-unidades", "API e integrações", "Suporte dedicado 24/7", "Profissionais ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

export const abaPlans = [
  {
    name: "Básico", price: "R$ 99", description: "Ideal para terapeutas autônomos", tier: "basico" as const,
    features: ["Registro de tentativas", "Agenda de sessões", "Prontuário básico", "Relatórios mensais", "1 profissional"],
    priceId: "flexus_aba_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para clínicas em crescimento", tier: "pro" as const,
    features: ["Tudo do Básico", "Gráficos de evolução", "PTI completo", "Controle de horas autorizadas", "Até 10 profissionais"],
    priceId: "flexus_aba_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para redes e grandes clínicas", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Multi-unidades", "Integração com convênios", "API e integrações", "Profissionais ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

export const crmPlans = [
  {
    name: "Básico", price: "R$ 99", description: "Para times pequenos começando", tier: "basico" as const,
    features: ["Pipeline kanban", "Gestão de leads", "Importação de contatos", "Relatórios básicos", "Até 3 usuários"],
    priceId: "flexus_crm_basico_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para equipes em escala", tier: "pro" as const,
    features: ["Tudo do Básico", "Automações de follow-up", "WhatsApp integrado", "Funil customizável", "Até 15 usuários"],
    priceId: "flexus_crm_pro_mensal", ctaLabel: "Começar Agora",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para grandes operações comerciais", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Múltiplas equipes", "Relatórios avançados", "API e integrações", "Usuários ilimitados"],
    ctaLabel: "Falar com Consultor",
  },
];

export const casa360Plans = [
  {
    name: "Básico", price: "R$ 99", description: "Para quem mora sozinho", tier: "basico" as const,
    features: ["Estoque da casa", "Lista de compras automática", "Controle de validade", "Finanças básicas do mês", "1 morador"],
    priceId: "flexus_casa360_basico_mensal", ctaLabel: "Começar Agora",
    annualPrice: "R$ 950", annualPriceId: "flexus_casa360_basico_anual",
  },
  {
    name: "Pro", price: "R$ 199", description: "Para casais e famílias", tier: "pro" as const,
    features: ["Tudo do Básico", "Até 6 moradores", "Contas recorrentes e lembretes", "Histórico de preços", "Relatórios avançados"],
    priceId: "flexus_casa360_pro_mensal", ctaLabel: "Começar Agora",
    annualPrice: "R$ 1.910", annualPriceId: "flexus_casa360_pro_anual",
  },
  {
    name: "Enterprise", price: "R$ 399", description: "Para famílias grandes e múltiplas residências", tier: "enterprise" as const,
    features: ["Tudo do Pro", "Múltiplas residências", "Moradores ilimitados", "API e integrações", "Suporte dedicado"],
    ctaLabel: "Falar com Consultor",
  },
];

