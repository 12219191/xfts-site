/**
 * Catálogo dos sistemas FLEXUS.
 *
 * Este site é o hub central (conta + assinatura + acesso). Cada sistema roda
 * no seu próprio domínio e recebe o usuário já autenticado via SSO.
 */

export type FlexusAppKey =
  | "barbearia"
  | "crm"
  | "casa360"
  | "clinica"
  | "estetica"
  | "aba"
  | "atende";

export interface FlexusApp {
  key: FlexusAppKey;
  name: string;
  /** Domínio do sistema (sem barra final). Vazio quando ainda não existe. */
  url: string;
  /**
   * Endpoint que recebe o webhook de provisionamento.
   * Sistemas SPA não servem rotas de API no próprio domínio: nesses casos
   * apontamos para a função de backend do projeto.
   */
  provisionUrl?: string;
  /** Endpoint que recebe leads dos formulários do site (apenas o CRM). */
  leadUrl?: string;
  /** Prefixo dos lookup keys de preço usados no checkout. */
  pricePrefix: string;
  /** Rota da landing do produto neste site. */
  landing: string;
  available: boolean;
}

export const FLEXUS_APPS: FlexusApp[] = [
  {
    key: "barbearia",
    name: "FLEXUS | Barbearia",
    url: "https://xfts-flexus6.com",
    provisionUrl: "https://xqosihkaxmgjrrtfrscm.supabase.co/functions/v1/flexus-provision",
    pricePrefix: "gestao_barbearias",
    landing: "/produtos/gestao-barbearias",
    available: true,
  },
  {
    key: "crm",
    name: "FLEXUS | CRM",
    url: "https://xfts-flexus7.com",
    provisionUrl: "https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-provision",
    leadUrl: "https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-lead",
    pricePrefix: "flexus_crm",
    landing: "/produtos/flexus-crm",
    available: true,
  },
  {
    key: "casa360",
    name: "FLEXUS | Casa360°",
    url: "https://xfts-flexus8.com",
    provisionUrl: "https://xfts-flexus8.com/api/public/provision",
    pricePrefix: "flexus_casa360",
    landing: "/produtos/flexus-casa360",
    available: true,
  },

  {
    key: "clinica",
    name: "FLEXUS | Clínica",
    url: "",
    pricePrefix: "gestao_clinica",
    landing: "/produtos/gestao-clinica",
    available: false,
  },
  {
    key: "estetica",
    name: "FLEXUS | Estética",
    url: "",
    pricePrefix: "gestao_esteticas",
    landing: "/produtos/gestao-esteticas",
    available: false,
  },
  {
    key: "aba",
    name: "FLEXUS | ABA",
    url: "",
    pricePrefix: "flexus_aba",
    landing: "/produtos/flexus-aba",
    available: false,
  },
  {
    key: "atende",
    name: "FLEXUS | Atende",
    url: "https://xfts-flexus10.com",
    provisionUrl: "https://xfts-flexus10.com/api/public/provision",
    pricePrefix: "flexus_atende",
    landing: "/produtos/flexus-atende",
    available: true,
  },
];

export function getFlexusApp(key: string): FlexusApp | undefined {
  return FLEXUS_APPS.find((a) => a.key === key);
}

/** Descobre a qual sistema um price_id/lookup key pertence. */
export function appKeyFromPriceId(priceId: string | null | undefined): FlexusAppKey | null {
  if (!priceId) return null;
  const app = FLEXUS_APPS.find((a) => priceId.startsWith(a.pricePrefix));
  return app ? app.key : null;
}

/** Extrai o nível do plano a partir do lookup key (basico | pro | enterprise). */
export function planTierFromPriceId(priceId: string | null | undefined): string {
  const lower = (priceId ?? "").toLowerCase();
  if (lower.includes("enterprise")) return "Enterprise";
  if (lower.includes("pro")) return "Pro";
  return "Básico";
}

/** Status que ainda liberam o uso do sistema (inclui carência de 3 dias). */
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

/**
 * Assentos (usuários da equipe) inclusos por plano.
 * O titular vive no hub; a equipe é convidada dentro do próprio sistema,
 * e o hub é a fonte de verdade do limite. `null` = ilimitado.
 */
export const SEATS_BY_TIER: Record<string, number | null> = {
  "Básico": 2,
  Pro: 6,
  Enterprise: null,
};

/**
 * Sobrescritas por sistema. Casa360° conta moradores, não profissionais:
 * Básico = 1 morador, Pro = 6 moradores, Enterprise = ilimitado.
 */
export const SEATS_BY_APP: Partial<Record<FlexusAppKey, Record<string, number | null>>> = {
  casa360: { "Básico": 1, Pro: 6, Enterprise: null },
};

/** Limite de usuários da equipe liberado pelo plano do price_id. */
export function seatsFromPriceId(priceId: string | null | undefined): number | null {
  const tier = planTierFromPriceId(priceId);
  const appKey = appKeyFromPriceId(priceId);
  const perApp = appKey ? SEATS_BY_APP[appKey] : undefined;
  if (perApp && tier in perApp) return perApp[tier]!;
  return tier in SEATS_BY_TIER ? SEATS_BY_TIER[tier]! : 2;
}

/** Ciclo de cobrança embutido no lookup key (mensal/anual). */
export function billingIntervalFromPriceId(
  priceId: string | null | undefined,
): "mensal" | "anual" {
  return (priceId ?? "").toLowerCase().includes("anual") ? "anual" : "mensal";
}


/** Texto amigável do limite de usuários. */
export function seatsLabel(seats: number | null): string {
  return seats === null ? "Usuários ilimitados" : `Até ${seats} usuários`;
}
