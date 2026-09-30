import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Panel, SectionHeading } from "@/components/ui/Layout";
import type { PackView, PlanView } from "@/lib/billing/prices";
import { cn, formatCredits, formatPrice } from "@/lib/utils";

/**
 * Pricing table.
 *
 * Layout follows the reference page: a raised rgba(255,255,255,0.08) container
 * with 16px radius holding equal-width cells (19px radius, 17px 20px padding),
 * the recommended plan marked by a brand-coloured action button.
 *
 * One deliberate deviation: the reference toggles between monthly and yearly
 * billing for four tiers. The backend's existing products are weekly, monthly
 * and yearly with fixed credit grants, so all three are shown side by side
 * rather than hiding one behind a toggle.
 */
export function PlanTable({ plans, className }: { plans: PlanView[]; className?: string }) {
  return (
    <div className={cn("rounded-panel-lg bg-white/8", className)}>
      <div className="grid grid-cols-1 gap-px md:grid-cols-3">
        {plans.map((view) => (
          <PlanCell key={view.plan.id} view={view} />
        ))}
      </div>
    </div>
  );
}

function PlanCell({ view }: { view: PlanView }) {
  const { plan, price, configured } = view;

  return (
    <div
      className={cn(
        "flex flex-col rounded-tile px-5 py-[17px]",
        plan.highlight ? "bg-white/6" : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        <p className="text-base text-ink-50">{plan.name}</p>
        {plan.highlight ? (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-white">推荐</span>
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        {price ? (
          <>
            <span className="text-[32px] leading-10 font-bold tracking-[-1px] text-ink-50">
              {formatPrice(price.amountCents, price.currency)}
            </span>
            <span className="text-nav text-white/50">
              / {plan.id === "weekly" ? "周" : plan.id === "yearly" ? "年" : "月"}
            </span>
          </>
        ) : (
          <span className="text-[32px] leading-10 font-bold tracking-[-1px] text-white/35">待配置</span>
        )}
      </div>

      <p className="mt-1 text-micro text-white/45">{plan.description}</p>

      <div className="mt-5">
        <CheckoutButton
          kind="plan"
          id={plan.id}
          label={configured ? "选择方案" : "价格未配置"}
          variant={plan.highlight ? "brand" : "secondary"}
          size="md"
          disabled={!configured}
          disabledReason={configured ? undefined : `请在 Stripe 创建价格并设置 ${plan.monthlyPriceEnv}`}
        />
      </div>

      <ul className="mt-7 flex flex-col gap-1 border-t border-white/8 pt-7">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 py-1">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="size-4 shrink-0 text-brand"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span className="text-nav font-medium tracking-[-0.16px] text-ink-100">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One-off credit packs. */
export function CreditPackGrid({ packs, className }: { packs: PackView[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {packs.map(({ pack, price, configured }) => (
        <Panel key={pack.id} className="relative flex flex-col gap-4 p-5">
          {pack.badge ? (
            <span className="absolute top-4 right-4 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink-100">
              {pack.badge}
            </span>
          ) : null}

          <div>
            <p className="text-[28px] leading-9 font-bold tracking-[-0.8px] text-ink-50">
              {formatCredits(pack.credits)}
            </p>
            <p className="text-micro text-white/45">积分</p>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <p className="text-base text-ink-100">
              {price ? formatPrice(price.amountCents, price.currency) : <span className="text-white/35">待配置</span>}
            </p>
            <CheckoutButton
              kind="pack"
              id={pack.id}
              label={configured ? "购买" : "未配置"}
              variant="secondary"
              size="md"
              disabled={!configured}
              disabledReason={configured ? undefined : `请设置 ${pack.priceEnv}`}
            />
          </div>
        </Panel>
      ))}
    </div>
  );
}

/** Compact pricing teaser used on the landing page. */
export function PricingSection({ plans }: { plans: PlanView[] }) {
  return (
    <section id="pricing" className="flex scroll-mt-24 flex-col gap-8">
      <SectionHeading
        title="简单定价"
        description="今天就免费开始，随时可以升级或取消。"
      />
      <PlanTable plans={plans} />
      <p className="text-micro text-white/40">
        图生图 10 积分 / 次，图生视频 50 积分 / 次。订阅与积分包均由 Stripe 处理，可随时在账号页取消。
      </p>
    </section>
  );
}
