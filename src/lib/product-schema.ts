interface PlanLike {
  name: string;
  price: string;
  description: string;
  features: string[];
}

const toNumber = (price: string) => price.replace(/[^\d,.]/g, "").replace(".", "").replace(",", ".");

/** Builds Product + Offer JSON-LD for a FLEXUS product page. */
export function productJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  image?: string;
  plans: PlanLike[];
}) {
  const url = `https://xfts-flexus.com${opts.path}`;
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: opts.name,
      description: opts.description,
      url,
      ...(opts.image ? { image: opts.image } : {}),
      brand: { "@type": "Brand", name: "XFTS Inteligência Analítica" },
      category: "SoftwareApplication",
      offers: opts.plans.map((p) => ({
        "@type": "Offer",
        name: `${opts.name} - ${p.name}`,
        description: p.description,
        price: toNumber(p.price),
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        url,
      })),
    }),
  };
}
