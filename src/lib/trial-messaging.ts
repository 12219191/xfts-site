/** Texto de teste gratuito sempre derivado da configuração oficial do plano. */
export type TrialPlan = { trialDays?: number | null; priceId?: string; trialRequireCard?: boolean };

export type TrialMessage = {
  heading: string;
  detail: string;
  footnote: string;
};

/** Um plano sem preço contratável ou sem trial nunca anuncia teste sem cartão. */
export function hasCardlessTrial(plan: TrialPlan): boolean {
  return !!plan.priceId && Number.isInteger(plan.trialDays) && (plan.trialDays ?? 0) > 0 && plan.trialRequireCard === false;
}

export function trialBadgeLabel(plan: TrialPlan): string | null {
  if (!plan.priceId || !Number.isInteger(plan.trialDays) || (plan.trialDays ?? 0) <= 0) return null;
  return hasCardlessTrial(plan) ? `${plan.trialDays} dias grátis sem cartão` : `${plan.trialDays} dias grátis`;
}

export function getTrialMessage(plans: TrialPlan[], available = true): TrialMessage | null {
  if (!available || plans.length === 0) return null;
  const eligible = plans.filter((p) => trialBadgeLabel(p) !== null);
  if (!eligible.length) return null;

  const allSame = eligible.length === plans.length && new Set(eligible.map((p) => p.trialDays)).size === 1;
  const allWithoutCard = eligible.every(hasCardlessTrial);
  const someWithoutCard = eligible.some(hasCardlessTrial);
  return {
    heading: allSame ? `${eligible[0].trialDays} dias grátis para testar` : "Teste gratuito nos planos elegíveis",
    detail: allSame
      ? `Clientes elegíveis podem experimentar o plano por ${eligible[0].trialDays} dias. Se cancelarem antes do fim do teste, não haverá cobrança da mensalidade da assinatura.`
      : "A duração do teste varia conforme o plano. Clientes elegíveis que cancelarem antes do fim do período gratuito não terão cobrança da mensalidade da assinatura.",
    footnote: (allWithoutCard
      ? "Os planos elegíveis permitem começar sem cadastrar cartão. Sem um meio de pagamento até o fim do teste, a assinatura é cancelada automaticamente. "
      : someWithoutCard
        ? "Alguns planos permitem começar sem cartão; consulte a condição exibida em cada plano. Sem cartão ao fim de um teste sem cartão, a assinatura é cancelada automaticamente. "
        : "") +
      "Válido para novas assinaturas elegíveis. Serviços externos e custos adicionais podem ser cobrados separadamente. Confira as condições no checkout.",
  };
}
