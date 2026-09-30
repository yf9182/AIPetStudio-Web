import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Panel } from "@/components/ui/Layout";

export const metadata = { title: "查收登录邮件" };

export default async function CheckEmailPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <Panel className="w-full max-w-[440px] p-8">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M3.5 7.5 12 13l8.5-5.5" />
          </svg>
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.6px] text-ink-50">查收你的登录邮件</h1>
        <p className="mt-3 text-nav leading-6 text-white/55">
          我们已经把登录链接发送到
          {email ? <span className="mx-1 text-ink-100">{email}</span> : "你的邮箱"}。
          链接 15 分钟内有效，且只能使用一次。
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <ButtonLink href="/login" variant="secondary" size="md">
            换一个邮箱
          </ButtonLink>
          <p className="text-micro leading-5 text-white/35">
            没收到？请检查垃圾邮件文件夹，或
            <Link href="/login" className="mx-1 text-white/60 underline-offset-2 hover:underline">
              重新发送
            </Link>
            。
          </p>
        </div>
      </Panel>
    </Container>
  );
}
