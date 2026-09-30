import { PlanTable } from "@/components/billing/PricingTable";
import { Faq } from "@/components/marketing/Faq";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Panel, SectionHeading } from "@/components/ui/Layout";
import { loadPlanViews } from "@/lib/billing/prices";
import { isBillingConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "定价" };

const FAQ_ITEMS = [
  {
    question: "订阅和积分包有什么区别？",
    answer:
      "订阅按期自动发放积分，单价更低，适合持续创作；积分包一次性购买，积分不会过期，适合偶尔使用。两者可以同时拥有。"
  },
  {
    question: "积分会过期吗？",
    answer: "积分包购买的积分不会过期。订阅发放的积分在订阅有效期内有效。"
  },
  {
    question: "生成失败会扣积分吗？",
    answer: "不会。任务提交时会先扣除积分，如果生成失败，系统会自动把积分退回你的余额。"
  },
  {
    question: "可以随时取消订阅吗？",
    answer:
      "可以。在积分中心点「管理订阅与发票」进入 Stripe 客户门户，即可取消订阅、更换支付方式或下载发票，取消后当期仍然有效。"
  },
  {
    question: "支持哪些支付方式？",
    answer: "支付由 Stripe 处理，支持主流信用卡与 Apple Pay / Google Pay，具体可用方式取决于你的地区。"
  }
];

export default async function PricingPage() {
  const plans = await loadPlanViews().catch(() => []);
  const billingReady = isBillingConfigured();

  return (
    <Container className="flex flex-col gap-16 py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="max-w-2xl text-3xl font-bold tracking-[-1.6px] text-ink-50 sm:text-display">
          简单定价
        </h1>
        <p className="max-w-xl text-base leading-7 text-white/60">
          今天就免费开始，随时可以升级或取消。新账号首次登录赠送 20 积分。
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/#templates" size="lg">
            开始创作
          </ButtonLink>
          <ButtonLink href="/points" variant="secondary" size="lg">
            购买积分包
          </ButtonLink>
        </div>
      </div>

      {!billingReady ? (
        <Panel className="p-5">
          <p className="text-nav text-white/70">
            支付尚未配置：请设置 <code className="text-white/90">STRIPE_SECRET_KEY</code> 与各方案的
            Stripe 价格 ID，价格会自动显示在这里。在此之前按钮保持禁用，不会产生扣款。
          </p>
        </Panel>
      ) : null}

      <PlanTable plans={plans} />

      <section className="flex flex-col gap-8">
        <SectionHeading title="所有方案都包含" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "全部模板", body: "图生图与图生视频模板，持续更新。" },
            { title: "高清结果", body: "图片 1080p，视频由服务端统一转码。" },
            { title: "失败自动退回", body: "生成失败不扣积分，自动退回余额。" },
            { title: "作品长期保存", body: "所有生成记录都保留在「我的作品」。" }
          ].map((item) => (
            <Panel key={item.title} className="flex flex-col gap-2 p-5">
              <p className="text-base font-medium text-ink-50">{item.title}</p>
              <p className="text-nav leading-6 text-white/55">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeading title="常见问题" />
        <Faq items={FAQ_ITEMS} />
      </section>
    </Container>
  );
}
