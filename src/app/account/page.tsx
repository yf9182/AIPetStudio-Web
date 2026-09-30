import Link from "next/link";
import { auth } from "@/lib/auth";
import { DeleteAccountButton } from "@/components/site/DeleteAccountButton";
import { ManageSubscriptionButton } from "@/components/billing/CheckoutButton";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Panel, SectionHeading } from "@/components/ui/Layout";
import { SignInRequired } from "@/components/site/SignInRequired";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchWallet, WorkerError } from "@/lib/worker";
import { formatCredits } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "账号设置" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <Container className="py-16">
        <SignInRequired title="登录后管理账号" description="登录后可以查看账号信息、订阅状态并管理数据。" />
      </Container>
    );
  }

  const worker = await getWorkerSessionOrNull();
  const wallet = worker ? await loadWallet(worker.token) : null;

  return (
    <Container className="flex flex-col gap-12 py-12">
      <SectionHeading title="账号设置" description="管理你的账号信息、订阅与数据。" />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-ink-100">账号信息</h2>
        <Panel className="divide-y divide-white/6">
          <Row label="邮箱" value={session.user.email || "—"} />
          <Row label="登录方式" value={session.user.email ? "邮箱 / Google" : "Google"} />
          <Row label="账户编号" value={(worker?.customerId ?? session.customerId ?? "—").replace(/^aipet_/, "")} />
        </Panel>
        <p className="text-micro leading-5 text-white/35">
          账户编号用于关联积分与作品。网页端与 iOS App 使用各自独立的账号，暂时不能互通。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-ink-100">积分与订阅</h2>
        <Panel className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-micro text-white/45">当前余额</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-[-1.2px] text-ink-50">
                  {wallet ? formatCredits(wallet.balance) : "—"}
                </span>
                <span className="text-nav text-white/50">积分</span>
              </p>
            </div>
            <div>
              <p className="text-micro text-white/45">订阅状态</p>
              <p className="mt-1 text-base text-ink-100">
                {wallet?.entitlement ? "已订阅" : "未订阅"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/points" size="md">
              购买积分
            </ButtonLink>
            <ButtonLink href="/pricing" variant="secondary" size="md">
              查看方案
            </ButtonLink>
            <ManageSubscriptionButton />
          </div>
        </Panel>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-ink-100">数据</h2>
        <Panel className="flex flex-col gap-4 p-6">
          <p className="text-nav leading-6 text-white/55">
            删除账号会同时清除积分余额、作品记录和上传的参考图。已经生成并下载到本地的文件不受影响。
          </p>
          <DeleteAccountButton />
        </Panel>
      </section>

      <p className="text-micro text-white/35">
        需要帮助？请查看
        <Link href="/#faq" className="mx-1 text-white/60 underline-offset-2 hover:underline">
          常见问题
        </Link>
        。
      </p>
    </Container>
  );
}

async function loadWallet(token: string) {
  try {
    return await fetchWallet(token);
  } catch (cause) {
    if (cause instanceof WorkerError) return null;
    throw cause;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <span className="text-nav text-white/45">{label}</span>
      <span className="text-nav text-ink-100">{value}</span>
    </div>
  );
}
