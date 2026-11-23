/**
 * Diagnósticos gratuitos de maturidade (sites externos).
 * Cada ponto do site usa um utm_content próprio para o CRM saber a origem do lead.
 */
export type DiagnosticoKey = "estetica" | "barbearia";
export type DiagnosticoPlacement = "pagina" | "rodape" | "blog";

const BASE_URL: Record<DiagnosticoKey, string> = {
  estetica: "https://diagnostico.xfts-flexus.com/",
  barbearia: "https://diagnostico2.xfts-flexus.com/",
};

export const DIAGNOSTICO_COPY: Record<DiagnosticoKey, { text: string; footerLabel: string }> = {
  estetica: {
    text: "Não sabe por onde começar? Descubra o nível de maturidade da sua clínica em cerca de 10 minutos. 35 perguntas, resultado na hora.",
    footerLabel: "Diagnóstico para clínicas e salões",
  },
  barbearia: {
    text: "Sua barbearia está sob controle? Responda 15 perguntas em cerca de 3 minutos e veja o resultado na hora.",
    footerLabel: "Diagnóstico para barbearias",
  },
};

export const DIAGNOSTICO_BUTTON_LABEL = "Fazer o diagnóstico gratuito";

export function isDiagnosticoKey(value: string): value is DiagnosticoKey {
  return value === "estetica" || value === "barbearia";
}

export function diagnosticoUrl(key: DiagnosticoKey, placement: DiagnosticoPlacement): string {
  const params = new URLSearchParams({
    utm_source: "site",
    utm_medium: "botao",
    utm_campaign: "diagnostico-maturidade",
    utm_content: `${placement}-${key}`,
  });
  return `${BASE_URL[key]}?${params.toString()}`;
}
