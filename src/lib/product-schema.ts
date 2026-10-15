/**
 * src/lib/product-schema.ts
 *
 * Gera o JSON-LD de cada página de produto do FLEXUS.
 *
 * Modos:
 *  - "software" (padrão): @type SoftwareApplication. Remove os avisos de
 *    Listagens do comerciante e Snippets do produto. O Google pode abrir um
 *    relatório de "Aplicativos de software" pedindo aggregateRating/review.
 *    Inofensivo para indexação; some se houver avaliações reais na página.
 *  - "service": @type Service. Não gera relatório de rich result algum,
 *    mas também não permite estrelas.
 *
 * REGRA: só passe `rating` / `reviews` se as avaliações forem reais e estiverem
 * visíveis na própria página. Marcar avaliações inexistentes pode gerar ação
 * manual do Google em todo o site.
 */

export type SchemaMode = "software" | "service";

export interface PlanOffer {
  /** Ex.: "FLEXUS | Barbearia - Básico". Deve bater com o nome exibido na página. */
  name: string;
  /** Preço em reais, ex.: 99 ou "99.00". Deve bater com o preço exibido. */
  price: number | string;
  /** URL do plano; se omitida, usa a URL da página. */
  url?: string;
  /** Data (AAAA-MM-DD) até a qual o preço é válido. Opcional. */
  priceValidUntil?: string;
}

export interface ReviewInput {
  author: string;
  /** AAAA-MM-DD */
  datePublished: string;
  /** Nota de 1 a 5 */
  ratingValue: number;
  body: string;
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  /** URL canônica da página, ex.: https://xfts-flexus.com/produtos/gestao-barbearias */
  url: string;
  image?: string;
  offers: PlanOffer[];
  /** Somente com avaliações reais e visíveis na página. */
  rating?: { value: number; count: number };
  /** Somente com avaliações reais e visíveis na página. */
  reviews?: ReviewInput[];
  mode?: SchemaMode;
}

const SITE_URL = "https://xfts-flexus.com";

const PROVIDER = {
  "@type": "Organization",
  name: "XFTS Inteligência Analítica",
  url: SITE_URL,
} as const;

function formatPrice(price: number | string): string {
  const n = typeof price === "number" ? price : Number(String(price).replace(",", "."));
  if (!Number.isFinite(n)) {
    throw new Error(`Preço inválido no schema: ${price}`);
  }
  return n.toFixed(2);
}

function buildOffers(input: ProductSchemaInput) {
  return input.offers.map((o) => ({
    "@type": "Offer",
    name: o.name,
    price: formatPrice(o.price),
    priceCurrency: "BRL",
    url: o.url ?? input.url,
    availability: "https://schema.org/InStock",
    ...(o.priceValidUntil ? { priceValidUntil: o.priceValidUntil } : {}),
  }));
}

function buildRatings(input: ProductSchemaInput) {
  const out: Record<string, unknown> = {};

  if (input.rating && input.rating.count > 0) {
    out.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(input.rating.value),
      reviewCount: String(input.rating.count),
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (input.reviews && input.reviews.length > 0) {
    out.review = input.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.datePublished,
      reviewBody: r.body,
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(r.ratingValue),
        bestRating: "5",
        worstRating: "1",
      },
    }));
  }

  return out;
}

export function buildProductSchema(input: ProductSchemaInput) {
  const mode: SchemaMode = input.mode ?? "software";
  const offers = buildOffers(input);

  if (mode === "service") {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name: input.name,
      description: input.description,
      url: input.url,
      ...(input.image ? { image: input.image } : {}),
      serviceType: "Sistema de gestão (SaaS)",
      provider: PROVIDER,
      areaServed: { "@type": "Country", name: "BR" },
      offers,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    author: PROVIDER,
    offers,
    ...buildRatings(input),
  };
}

/** Retorna a tag <script> pronta, com escape de "<" para evitar quebra do HTML. */
export function productSchemaScript(input: ProductSchemaInput): string {
  const json = JSON.stringify(buildProductSchema(input)).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

/* Exemplo de uso:

const schema = buildProductSchema({
  name: "FLEXUS | Barbearia",
  description: "Sistema SaaS de gestão para barbearias...",
  url: `${SITE_URL}/produtos/gestao-barbearias`,
  offers: [{ name: "FLEXUS | Barbearia - Básico", price: 99 }],
  // mode: "service",   // descomente para usar Service
  // rating: { value: 4.8, count: 37 },  // só com avaliações reais visíveis
});
*/

interface PlanLike {
  name: string;
  price: string;
  description: string;
  features: string[];
}

const parseBrl = (price: string) =>
  Number(price.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", "."));

/** Adaptador para head().scripts das páginas de produto (TanStack Router). */
export function productJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  image?: string;
  plans: PlanLike[];
  mode?: SchemaMode;
}) {
  const url = `${SITE_URL}${opts.path}`;
  const offers: PlanOffer[] = opts.plans
    .filter((p) => Number.isFinite(parseBrl(p.price)) && parseBrl(p.price) > 0)
    .map((p) => ({ name: `${opts.name} - ${p.name}`, price: parseBrl(p.price) }));
  const image = opts.image && /^https?:\/\//.test(opts.image) ? opts.image : undefined;
  const schema = buildProductSchema({
    name: opts.name, description: opts.description, url, image, offers, mode: opts.mode,
  });
  return {
    type: "application/ld+json",
    children: JSON.stringify(schema).replace(/</g, "\\u003c"),
  };
}
