/**
 * Billing catalog.
 *
 * Credit amounts mirror the products the backend already knows about
 * (`REVENUECAT_PRODUCTS` in `AIPetStudio-Backend/src/index.ts`) so a web
 * purchase grants exactly the same number of credits as the iOS purchase:
 *
 *   points.100 / .350 / .900 / .2200
 *   subscription.weekly → 300, .monthly → 1200, .yearly → 10000
 *
 * Prices are deliberately *not* hard-coded: the Stripe Price object is the
 * single source of truth, and the UI reads the amount back from Stripe. The
 * `fallbackPriceCents` values below are only used when Stripe is not yet
 * configured, and the UI labels them as unconfigured in that case.
 */

export type CreditPack = {
  id: string;
  credits: number;
  /** Environment variable holding the Stripe one-off price id. */
  priceEnv: string;
  fallbackPriceCents: number;
  badge?: string;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  credits: number;
  /** Environment variables holding the Stripe recurring price ids. */
  monthlyPriceEnv: string;
  yearlyPriceEnv: string;
  fallbackMonthlyCents: number;
  fallbackYearlyCents: number;
  description: string;
  features: string[];
  highlight?: boolean;
};

/** 1 credit = 10 points in the backend's own vocabulary. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "credits_100", credits: 100, priceEnv: "STRIPE_PRICE_CREDITS_100", fallbackPriceCents: 199 },
  { id: "credits_350", credits: 350, priceEnv: "STRIPE_PRICE_CREDITS_350", fallbackPriceCents: 599, badge: "最受欢迎" },
  { id: "credits_900", credits: 900, priceEnv: "STRIPE_PRICE_CREDITS_900", fallbackPriceCents: 1499 },
  { id: "credits_2200", credits: 2200, priceEnv: "STRIPE_PRICE_CREDITS_2200", fallbackPriceCents: 3499, badge: "最划算" }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "weekly",
    name: "周付",
    credits: 300,
    monthlyPriceEnv: "STRIPE_PRICE_SUB_WEEKLY",
    yearlyPriceEnv: "STRIPE_PRICE_SUB_WEEKLY",
    fallbackMonthlyCents: 699,
    fallbackYearlyCents: 699,
    description: "先试一周，随时取消。",
    features: ["每周 300 积分", "全部模板", "图生图与图生视频", "高清结果下载"]
  },
  {
    id: "monthly",
    name: "月付",
    credits: 1200,
    monthlyPriceEnv: "STRIPE_PRICE_SUB_MONTHLY",
    yearlyPriceEnv: "STRIPE_PRICE_SUB_MONTHLY",
    fallbackMonthlyCents: 1999,
    fallbackYearlyCents: 1999,
    description: "每月固定积分，适合稳定更新。",
    features: ["每月 1200 积分", "全部模板", "图生图与图生视频", "高清结果下载", "优先生成队列"],
    highlight: true
  },
  {
    id: "yearly",
    name: "年付",
    credits: 10000,
    monthlyPriceEnv: "STRIPE_PRICE_SUB_YEARLY",
    yearlyPriceEnv: "STRIPE_PRICE_SUB_YEARLY",
    fallbackMonthlyCents: 14999,
    fallbackYearlyCents: 14999,
    description: "一次付清，全年最低单价。",
    features: ["每年 10000 积分", "全部模板", "图生图与图生视频", "高清结果下载", "优先生成队列", "新模板抢先体验"]
  }
];

/** Fixed server-side generation prices, matching the backend. */
export const GENERATION_COST = { image: 10, video: 50 } as const;

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.id === id);
}

export function planById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}
