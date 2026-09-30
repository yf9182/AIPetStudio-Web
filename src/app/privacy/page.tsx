import { Container } from "@/components/ui/Layout";

export const metadata = { title: "隐私政策" };

export default function PrivacyPage() {
  return (
    <Container className="flex max-w-[720px] flex-col gap-6 py-14">
      <h1 className="text-3xl font-bold tracking-[-1.4px] text-ink-50 sm:text-headline">隐私政策</h1>
      <p className="text-nav leading-7 text-white/55">
        本页为占位内容。正式上线前请由运营方补充完整的隐私政策文本。下面是本系统实际处理的数据，
        可作为撰写依据。
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-ink-100">实际处理的数据</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-nav leading-6 text-white/55">
          <li>账号信息：邮箱地址，或 Google 返回的账号标识与头像。</li>
          <li>上传内容：你为生成而上传的宠物照片，保存在服务端私有对象存储中。</li>
          <li>生成记录：模板、消耗积分、任务状态与结果链接。</li>
          <li>支付信息：由 Stripe 处理，本站不接触也不存储银行卡信息。</li>
          <li>会话信息：加密的登录 Cookie，用于维持登录状态。</li>
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-ink-100">第三方服务</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-nav leading-6 text-white/55">
          <li>Stripe —— 支付与订阅管理</li>
          <li>RevenueCat —— 积分余额与账本</li>
          <li>Vidu —— 图像与视频生成</li>
          <li>Resend —— 登录邮件的发送</li>
        </ul>
      </section>
      <p className="text-nav leading-6 text-white/55">
        你可以在账号设置中删除账号，届时积分余额、作品记录与上传的参考图都会被清除。
      </p>
    </Container>
  );
}
