"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container, Panel } from "@/components/ui/Layout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setPending("email");
    setError(null);

    try {
      const result = await signIn("resend", { email: email.trim(), redirect: false });
      if (result?.error) throw new Error("发送失败，请确认邮箱地址是否正确");
      router.push(`/login/check-email?email=${encodeURIComponent(email.trim())}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发送失败，请稍后重试");
      setPending(null);
    }
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-[400px]">
        <h1 className="text-3xl font-bold tracking-[-1.4px] text-ink-50 sm:text-headline">登录</h1>
        <p className="mt-3 text-nav leading-6 text-white/55">
          登录后即可生成作品、保存积分并查看历史记录。首次登录赠送 20 积分。
        </p>

        <Panel className="mt-8 flex flex-col gap-5 p-6">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={pending !== null}
            onClick={() => {
              setPending("google");
              void signIn("google", { callbackUrl: "/" });
            }}
          >
            <GoogleMark />
            {pending === "google" ? "正在跳转…" : "使用 Google 继续"}
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-micro text-white/35">或</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-micro text-white/50">邮箱地址</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11 rounded-panel bg-ink-800 px-4 text-base text-ink-100 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>

            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending !== null}>
              {pending === "email" ? "正在发送…" : "发送登录链接"}
            </Button>
          </form>

          {error ? (
            <p className="rounded-panel bg-red-500/10 px-3 py-2.5 text-nav text-red-300">{error}</p>
          ) : null}

          <p className="text-micro leading-5 text-white/35">
            继续即表示你同意我们的
            <Link href="/terms" className="mx-1 text-white/60 underline-offset-2 hover:underline">
              服务条款
            </Link>
            与
            <Link href="/privacy" className="mx-1 text-white/60 underline-offset-2 hover:underline">
              隐私政策
            </Link>
            。
          </p>
        </Panel>
      </div>
    </Container>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
