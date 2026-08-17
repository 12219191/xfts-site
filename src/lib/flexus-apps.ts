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
  | "aba";

export interface FlexusApp {
  key: FlexusAppKey;
  name: string;
  /** Domínio do sistema (sem barra final). Vazio quando ainda não existe. */
  url: string;
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
    pricePrefix: "gestao_barbearias",
    landing: "/produtos/gestao-barbearias",
    available: true,
  },
  {
    key: "crm",
    name: "FLEXUS | CRM",
    url: "https://xfts-flexus7.com",
    pricePrefix: "flexus_crm",
    landing: "/produtos/flexus-crm",
    available: true,
  },
  {
    key: "casa360",
    name: "FLEXUS | Casa360°",
    url: "https://xfts-flexus8.com",
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
