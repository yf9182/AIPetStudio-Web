import { Container } from "@/components/ui/Layout";

export const metadata = { title: "服务条款" };

export default function TermsPage() {
  return (
    <Container className="flex max-w-[720px] flex-col gap-6 py-14">
      <h1 className="text-3xl font-bold tracking-[-1.4px] text-ink-50 sm:text-headline">服务条款</h1>
      <p className="text-nav leading-7 text-white/55">
        本页为占位内容。正式上线前请由运营方补充完整的服务条款文本，包括服务范围、积分与订阅规则、
        退款政策、用户内容责任、免责声明与争议解决条款。
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-ink-100">需要覆盖的内容</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-nav leading-6 text-white/55">
          <li>账号与登录方式（邮箱、Google）</li>
          <li>积分购买、消耗、失败退回与过期规则</li>
          <li>订阅的自动续费、取消与退款政策</li>
          <li>用户上传图片的授权范围与内容规范</li>
          <li>生成结果的版权归属与商业使用许可</li>
          <li>服务可用性、责任限制与条款变更通知</li>
        </ul>
      </section>
    </Container>
  );
}
