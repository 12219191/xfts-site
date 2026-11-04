/** Texto de teste gratuito sempre derivado da configuração oficial do plano. */
export type TrialPlan = { trialDays?: number | null; priceId?: string };

export type TrialMessage = {
  heading: string;
  detail: string;
  footnote: string;
};

export function getTrialMessage(plans: TrialPlan[], available = true): TrialMessage | null {
  if (!available || plans.length === 0) return null;
  const days = plans.map((p) => (p.priceId && Number.isInteger(p.trialDays) && (p.trialDays ?? 0) > 0 ? p.trialDays! : 0));
  const eligible = days.filter((day) => day > 0);
  if (!eligible.length) return null;

  const allSame = eligible.length === plans.length && new Set(eligible).size === 1;
  return {
    heading: allSame ? `${eligible[0]} dias grátis para testar` : "Teste gratuito nos planos elegíveis",
    detail: allSame
      ? `Clientes elegíveis podem experimentar o plano por ${eligible[0]} dias. Se cancelarem antes do fim do teste, não haverá cobrança da mensalidade da assinatura.`
      : "A duração do teste varia conforme o plano. Clientes elegíveis que cancelarem antes do fim do período gratuito não terão cobrança da mensalidade da assinatura.",
    footnote: "Válido para novas assinaturas elegíveis. Serviços externos e custos adicionais podem ser cobrados separadamente. Confira as condições no checkout.",
  };
}
