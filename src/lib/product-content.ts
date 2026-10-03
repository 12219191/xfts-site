/**
 * Conteúdo de apresentação dos produtos em código.
 * É apenas o fallback: a fonte de verdade é `catalog_products` no banco,
 * editável no Control Center.
 */
import heroClinicAsset from "@/assets/hero-clinic.webp.asset.json";
import heroBarbershopAsset from "@/assets/hero-barbershop.webp.asset.json";
import heroAestheticsAsset from "@/assets/hero-aesthetics.webp.asset.json";
import heroAbaAsset from "@/assets/hero-aba.webp.asset.json";
import heroCrmAsset from "@/assets/hero-crm.webp.asset.json";
import heroCasa360Asset from "@/assets/hero-casa360.webp.asset.json";
import heroAtende from "@/assets/hero-atende.jpg";

export interface ProductContent {
  icon: string;
  shortDescription: string;
  imageUrl: string;
  imageAlt: string;
}

export const PRODUCT_CONTENT: Record<string, ProductContent> = {
  clinica: {
    icon: "Stethoscope",
    shortDescription:
      "Sistema completo para consultórios e clínicas. Agendamentos, prontuários eletrônicos e controle financeiro.",
    imageUrl: heroClinicAsset.url,
    imageAlt: "FLEXUS | Clínica — software de gestão para clínicas em uso na recepção",
  },
  barbearia: {
    icon: "Scissors",
    shortDescription:
      "Controle de estoque, vendas, PDV e CRM para barbearias e salões masculinos.",
    imageUrl: heroBarbershopAsset.url,
    imageAlt: "FLEXUS | Barbearia — sistema de gestão para barbearias em uso no salão",
  },
  estetica: {
    icon: "Sparkles",
    shortDescription: "Estoque, vendas e CRM para clínicas de estética e salões de beleza.",
    imageUrl: heroAestheticsAsset.url,
    imageAlt: "FLEXUS | Estética — software de gestão para clínicas de estética",
  },
  aba: {
    icon: "Brain",
    shortDescription:
      "Sistema para clínicas de Análise do Comportamento Aplicada (ABA / TEA): coleta de dados, evolução e relatórios.",
    imageUrl: heroAbaAsset.url,
    imageAlt: "FLEXUS | ABA — plataforma de gestão para clínicas de terapia ABA",
  },
  crm: {
    icon: "TrendingUp",
    shortDescription:
      "CRM de vendas multi-segmento com pipeline kanban, automações e relatórios de conversão.",
    imageUrl: heroCrmAsset.url,
    imageAlt: "FLEXUS | CRM — painel de CRM com funil de vendas e oportunidades",
  },
  casa360: {
    icon: "House",
    shortDescription:
      "ERP doméstico: estoque da despensa, lista de compras automática e finanças da casa em um só painel.",
    imageUrl: heroCasa360Asset.url,
    imageAlt: "FLEXUS | Casa360° — sistema de gestão para casas de repouso e cuidado 360°",
  },
  atende: {
    icon: "MessageCircle",
    shortDescription:
      "Atendimento pelo WhatsApp (API oficial) com agentes de IA configuráveis, base de conhecimento própria e caixa de entrada para a equipe.",
    imageUrl: heroAtende,
    imageAlt: "FLEXUS | Atende — atendente usando a caixa de entrada com agente de IA",
  },
};

export function productContent(key: string): ProductContent {
  return (
    PRODUCT_CONTENT[key] ?? {
      icon: "Sparkles",
      shortDescription: "",
      imageUrl: "",
      imageAlt: "",
    }
  );
}
