import { Suspense } from "react";
import { CheckoutReturn } from "@/components/billing/CheckoutReturn";
import { CheckoutButton, ManageSubscriptionButton } from "@/components/billing/CheckoutButton";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Panel, SectionHeading } from "@/components/ui/Layout";
import { SignInRequired } from "@/components/site/SignInRequired";
import { CREDIT_PACKS, GENERATION_COST } from "@/lib/billing/catalog";
import { loadPackViews } from "@/lib/billing/prices";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchWallet, WorkerError, type WorkerWallet } from "@/lib/worker";
import { formatCredits, formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "积分中心" };

export default async function PointsPage() {
  const session = await getWorkerSessionOrNull();

  if (!session) {
    return (
      <Container className="py-16">
        <SignInRequired
          title="登录后查看积分"
          description="积分与作品都保存在账号里，登录即可查看余额、充值和消费记录。"
        />
      </Container>
    );
  }

  const [walletResult, packs] = await Promise.all([
    loadWallet(session.token),
    loadPackViews()
  ]);

  const wallet = walletResult.wallet;

  return (
    <Container className="flex flex-col gap-14 py-12">
      <Suspense fallback={null}>
        <CheckoutReturn />
      </Suspense>

      <SectionHeading
        title="积分中心"
        description="积分用于生成作品。图生图每次 10 积分，图生视频每次 50 积分。"
        action={
          <ButtonLink href="/pricing" variant="outline" size="md">
            查看订阅方案
          </ButtonLink>
        }
      />

      {walletResult.error || !wallet ? (
        <Panel className="p-6">
          <p className="text-base font-medium text-ink-50">暂时无法读取积分余额</p>
          <p className="mt-2 text-nav text-white/55">{walletResult.error}</p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Panel className="flex flex-col justify-between gap-6 p-6 lg:col-span-2">
              <div>
                <p className="text-micro text-white/45">当前余额</p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-[44px] leading-[52px] font-bold tracking-[-2px] text-ink-50">
                    {formatCredits(wallet.balance)}
                  </span>
                  <span className="text-nav text-white/50">积分</span>
                </p>
                <p className="mt-3 text-nav text-white/50">
                  可生成约 {Math.floor(wallet.balance / GENERATION_COST.image)} 张图生图，或{" "}
                  {Math.floor(wallet.balance / GENERATION_COST.video)} 个图生视频。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="#packs" size="md">
                  购买积分
                </ButtonLink>
                <ManageSubscriptionButton />
              </div>
            </Panel>

            <Panel className="flex flex-col justify-between gap-4 p-6">
              <div>
                <p className="text-micro text-white/45">订阅状态</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.4px] text-ink-50">
                  {wallet.entitlement ? "已订阅" : "未订阅"}
                </p>
                <p className="mt-2 text-nav leading-6 text-white/50">
                  {wallet.entitlement
                    ? "订阅有效期内每月自动发放积分。"
                    : "订阅后每月自动获得积分，比单独购买更划算。"}
                </p>
              </div>
              <p className="text-micro text-white/35">
                账户编号 {session.customerId.replace(/^aipet_/, "").slice(0, 10)}
              </p>
            </Panel>
          </div>

          {wallet.welcome_bonus_granted ? (
            <p className="rounded-panel bg-brand-soft px-4 py-3 text-nav text-white" role="status">
              欢迎加入！已为你发放 {wallet.welcome_bonus_points} 积分，可以先生成两次图生图试试。
            </p>
          ) : null}

          <section id="packs" className="flex scroll-mt-24 flex-col gap-8">
            <SectionHeading title="积分包" description="一次性购买，积分不会过期。" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {packs.map(({ pack, price, configured }) => (
                <Panel key={pack.id} className="relative flex flex-col gap-5 p-5">
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

                  <p className="text-nav text-white/50">
                    约 {Math.floor(pack.credits / GENERATION_COST.image)} 张图生图
                  </p>

                  <div className="mt-auto flex flex-col gap-3">
                    <p className="text-base text-ink-100">
                      {price ? (
                        formatPrice(price.amountCents, price.currency)
                      ) : (
                        <span className="text-white/35">待配置</span>
                      )}
                    </p>
                    <CheckoutButton
                      kind="pack"
                      id={pack.id}
                      label={configured ? "购买" : "未配置"}
                      variant="secondary"
                      size="md"
                      disabled={!configured}
                      disabledReason={
                        configured ? undefined : `请创建 Stripe 价格并设置 ${pack.priceEnv}`
                      }
                    />
                  </div>
                </Panel>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <SectionHeading title="积分流水" description="最近 50 条记录。" />

            {wallet.transactions.length === 0 ? (
              <Panel className="p-6">
                <p className="text-nav text-white/50">还没有积分变动记录。</p>
              </Panel>
            ) : (
              <div className="overflow-hidden rounded-panel-lg bg-white/4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="px-5 py-3 text-micro font-medium text-white/45">时间</th>
                      <th className="px-5 py-3 text-micro font-medium text-white/45">说明</th>
                      <th className="px-5 py-3 text-right text-micro font-medium text-white/45">变动</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.transactions.map((entry) => (
                      <tr key={entry.id} className="border-b border-white/6 last:border-0">
                        <td className="px-5 py-3 text-nav text-white/50">{formatDate(entry.created_at)}</td>
                        <td className="px-5 py-3 text-nav text-ink-100">{reasonLabel(entry.reason)}</td>
                        <td
                          className={
                            entry.amount >= 0
                              ? "px-5 py-3 text-right text-nav font-medium tabular-nums text-brand"
                              : "px-5 py-3 text-right text-nav font-medium tabular-nums text-white/60"
                          }
                        >
                          {entry.amount >= 0 ? "+" : ""}
                          {formatCredits(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <p className="text-micro leading-5 text-white/35">
        积分由 Stripe 完成支付，生成任务在提交时即扣除积分；如果生成失败，积分会自动退回。
        积分包共 {CREDIT_PACKS.length} 档，订阅方案见
        <a href="/pricing" className="mx-1 text-white/60 underline-offset-2 hover:underline">
          定价页
        </a>
        。
      </p>
    </Container>
  );
}

async function loadWallet(
  token: string
): Promise<{ wallet: WorkerWallet | null; error: string | null }> {
  try {
    return { wallet: await fetchWallet(token), error: null };
  } catch (cause) {
    return {
      wallet: null,
      error: cause instanceof WorkerError ? cause.message : "积分服务暂时不可用"
    };
  }
}

/** Backend ledger reasons are stable machine strings; show them in Chinese. */
function reasonLabel(reason: string): string {
  switch (reason) {
    case "signup":
      return "新用户赠送";
    case "purchase_points":
      return "购买积分包";
    case "subscription_points":
      return "订阅发放";
    case "stripe_purchase":
      return "Stripe 购买积分";
    case "stripe_subscription":
      return "Stripe 订阅发放";
    case "generation_debit":
      return "生成作品";
    case "generation_refund":
      return "生成失败退回";
    default:
      return reason;
  }
}
