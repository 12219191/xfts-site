/** Sincronização de preços do catálogo com o provedor de pagamento. */
import type Stripe from "stripe";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

/** Garante um produto no provedor para o plano (por metadata do catálogo). */
async function ensureProduct(
  stripe: Stripe,
  catalogKey: string,
  name: string,
): Promise<string> {
  const found = await stripe.products.search({
    query: `metadata['catalog_key']:'${catalogKey}'`,
    limit: 1,
  });
  const existing = found.data[0];
  if (existing) return existing.id;

  const created = await stripe.products.create({
    name,
    metadata: { catalog_key: catalogKey },
  });
  return created.id;
}

export interface PriceSyncInput {
  environment: StripeEnv;
  lookupKey: string;
  productName: string;
  amountCents: number;
  interval: "month" | "year";
}

export interface PriceSyncResult {
  lookupKey: string;
  priceId: string;
  created: boolean;
  archivedPriceId?: string;
}

/**
 * Garante que o lookup key aponte para um preço ativo com o valor informado.
 * Quando o valor muda, cria um preço novo, transfere o lookup key e arquiva o
 * antigo (assinantes atuais permanecem no preço antigo).
 */
export async function syncPrice(input: PriceSyncInput): Promise<PriceSyncResult> {
  const stripe = createStripeClient(input.environment);

  const existing = await stripe.prices.list({ lookup_keys: [input.lookupKey], limit: 1 });
  const current = existing.data[0];

  if (
    current &&
    current.unit_amount === input.amountCents &&
    current.recurring?.interval === input.interval
  ) {
    return { lookupKey: input.lookupKey, priceId: current.id, created: false };
  }

  const productId =
    (current && typeof current.product === "string" ? current.product : null) ??
    (await ensureProduct(stripe, input.lookupKey.replace(/_(mensal|anual)$/, ""), input.productName));

  const price = await stripe.prices.create({
    product: productId,
    currency: "brl",
    unit_amount: input.amountCents,
    recurring: { interval: input.interval },
    lookup_key: input.lookupKey,
    transfer_lookup_key: true,
    metadata: { catalog: "true" },
  });

  if (current) {
    await stripe.prices.update(current.id, { active: false });
  }

  return {
    lookupKey: input.lookupKey,
    priceId: price.id,
    created: true,
    ...(current ? { archivedPriceId: current.id } : {}),
  };
}

export interface PriceCheck {
  lookupKey: string;
  expectedCents: number;
  stripeCents: number | null;
  interval: string | null;
  ok: boolean;
}

/** Compara os valores do banco com os preços ativos no provedor. */
export async function checkPrices(
  environment: StripeEnv,
  entries: Array<{ lookupKey: string; expectedCents: number }>,
): Promise<PriceCheck[]> {
  const stripe = createStripeClient(environment);
  const results: PriceCheck[] = [];
  for (const entry of entries) {
    try {
      const list = await stripe.prices.list({ lookup_keys: [entry.lookupKey], limit: 1 });
      const price = list.data[0];
      results.push({
        lookupKey: entry.lookupKey,
        expectedCents: entry.expectedCents,
        stripeCents: price?.unit_amount ?? null,
        interval: price?.recurring?.interval ?? null,
        ok: price?.unit_amount === entry.expectedCents,
      });
    } catch {
      results.push({
        lookupKey: entry.lookupKey,
        expectedCents: entry.expectedCents,
        stripeCents: null,
        interval: null,
        ok: false,
      });
    }
  }
  return results;
}
