/** FAQ comercial do comparador: textos alinhados aos fluxos efetivos de assinatura e políticas. */
export const planComparisonFaqs = [
  {
    q: "Posso trocar de plano a qualquer momento?",
    a: "Você pode solicitar a troca de plano. O upgrade é aplicado imediatamente, com cobrança proporcional da diferença. O downgrade é agendado para a próxima renovação, sem crédito ou reembolso proporcional do período em curso.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "O período de teste depende do plano contratado e da elegibilidade do cliente. Confira as condições do plano antes de contratar.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "As assinaturas são contratadas pelo checkout seguro da Stripe, com pagamento por cartão. Apple Pay e Link podem aparecer quando elegíveis para o dispositivo e para a sessão. PIX e boleto não estão habilitados no momento. As opções disponíveis são sempre confirmadas na etapa de pagamento.",
  },
  {
    q: "Existe fidelidade ou contrato mínimo?",
    a: "Não! Todos os planos são sem fidelidade. Você pode cancelar a qualquer momento e continuará com acesso até o final do período já pago.",
  },
  {
    q: "O que acontece com meus dados se eu cancelar?",
    a: "Os prazos de retenção variam conforme a categoria dos dados, a finalidade do tratamento e as obrigações legais; não há um prazo único de 90 dias. Consulte a Política de Privacidade e a página de Exclusão de Dados para conhecer os critérios e solicitar o exercício dos seus direitos.",
    links: [
      { label: "Política de Privacidade", href: "/politica-de-privacidade" },
      { label: "Exclusão de Dados", href: "/exclusao-de-dados" },
    ],
  },
] as const;
