const SITE = "https://xfts-flexus.com";

const ORG_REF = { "@type": "Organization", name: "XFTS Inteligência Analítica", url: SITE };

const MODULES = [
  { name: "FLEXUS | Clínica", path: "/produtos/gestao-clinica", description: "Sistema de gestão para clínicas com agenda, prontuário e inteligência analítica." },
  { name: "FLEXUS | Barbearia", path: "/produtos/gestao-barbearias", description: "Estoque inteligente, PDV integrado, agendamento online, comissões e CRM para barbearias e salões masculinos." },
  { name: "FLEXUS | Estética", path: "/produtos/gestao-esteticas", description: "Pacotes e sessões, ficha de anamnese, agendamento online, comissões e estoque de insumos para clínicas de estética e salões." },
  { name: "FLEXUS | ABA", path: "/produtos/flexus-aba", description: "Sistema de gestão para clínicas de terapia ABA." },
  { name: "FLEXUS | CRM", path: "/produtos/flexus-crm", description: "CRM para gestão de leads, funil de vendas e relacionamento com clientes." },
  { name: "FLEXUS | Casa360", path: "/produtos/flexus-casa360", description: "Sistema de gestão para o segmento imobiliário e residencial." },
  { name: "FLEXUS | Atende", path: "/produtos/flexus-atende", description: "Atendimento via API oficial do WhatsApp com agentes de IA, base de conhecimento e caixa de entrada humana." },
];

export function softwareAppsJsonLd() {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": MODULES.map((m) => ({
        "@type": "SoftwareApplication",
        name: m.name,
        description: m.description,
        url: `${SITE}${m.path}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        publisher: ORG_REF,
      })),
    }),
  };
}

export function organizationJsonLd() {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "XFTS Inteligência Analítica",
      url: SITE,
      email: "xfts@xfts.com.br",
      telephone: "+55-17-99794-3349",
      address: {
        "@type": "PostalAddress",
        addressLocality: "São José do Rio Preto",
        addressRegion: "SP",
        addressCountry: "BR",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+55-17-99794-3349",
        email: "xfts@xfts.com.br",
        contactType: "customer service",
        availableLanguage: "Portuguese",
      },
    }),
  };
}
