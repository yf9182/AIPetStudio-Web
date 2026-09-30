import {
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  type CreditPack,
  type SubscriptionPlan
} from "@/lib/billing/catalog";
import { isBillingConfigured, resolvePrice, type ResolvedPrice } from "@/lib/billing/stripe";

/**
 * Billing view models.
 *
 * Amounts come from Stripe so the page can never disagree with what Checkout
 * charges. When a price id is missing or Stripe is unconfigured the entry is
 * marked `configured: false` and the UI disables the button instead of showing
 * a number that would not be honoured.
 */
export type PackView = {
  pack: CreditPack;
  price: ResolvedPrice | null;
  configured: boolean;
};

export type PlanView = {
  plan: SubscriptionPlan;
  price: ResolvedPrice | null;
  configured: boolean;
  /** Credits per US$1, used for the "best value" hint. */
  valuePerDollar: number | null;
};

export async function loadPackViews(): Promise<PackView[]> {
  if (!isBillingConfigured()) {
    return CREDIT_PACKS.map((pack) => ({ pack, price: null, configured: false }));
  }

  return Promise.all(
    CREDIT_PACKS.map(async (pack) => {
      const price = await resolvePrice(process.env[pack.priceEnv]);
      return { pack, price, configured: Boolean(price) };
    })
  );
}

export async function loadPlanViews(): Promise<PlanView[]> {
  if (!isBillingConfigured()) {
    return SUBSCRIPTION_PLANS.map((plan) => ({
      plan,
      price: null,
      configured: false,
      valuePerDollar: null
    }));
  }

  return Promise.all(
    SUBSCRIPTION_PLANS.map(async (plan) => {
      const price = await resolvePrice(process.env[plan.monthlyPriceEnv]);
      const valuePerDollar =
        price && price.amountCents > 0 ? plan.credits / (price.amountCents / 100) : null;
      return { plan, price, configured: Boolean(price), valuePerDollar };
    })
  );
}
