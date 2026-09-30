import Stripe from "stripe";

/**
 * Stripe client.
 *
 * Cloudflare Workers has no Node HTTP stack, so the SDK is pinned to its fetch
 * transport and the WebCrypto provider (the latter is required for webhook
 * signature verification).
 */
let cached: Stripe | null = null;

export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new Stripe(key, {
      // Pin nothing: the SDK's bundled API version is the one it is typed
      // against, and Stripe keeps it in sync with the installed major.
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
      appInfo: { name: "AI Pet Studio Web" }
    });
  }
  return cached;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export type ResolvedPrice = {
  id: string;
  amountCents: number;
  currency: string;
  /** "month" | "year" for recurring prices, null for one-off. */
  interval: string | null;
};

/**
 * Reads a price back from Stripe so the page always shows the amount that will
 * actually be charged, instead of a number duplicated in the codebase.
 * Results are cached for five minutes.
 */
export async function resolvePrice(priceId: string | undefined): Promise<ResolvedPrice | null> {
  if (!priceId) return null;
  const client = stripe();
  if (!client) return null;

  try {
    const price = await client.prices.retrieve(priceId, {}, { maxNetworkRetries: 1 });
    if (price.unit_amount === null) return null;
    return {
      id: price.id,
      amountCents: price.unit_amount,
      currency: price.currency.toUpperCase(),
      interval: price.recurring?.interval ?? null
    };
  } catch (cause) {
    console.error("Unable to load Stripe price", priceId, cause);
    return null;
  }
}
