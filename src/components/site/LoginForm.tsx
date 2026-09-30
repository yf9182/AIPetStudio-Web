"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Layout";

/**
 * Sign-in form.
 *
 * `google` and `email` come from the server, which knows which providers this
 * deployment actually has credentials for. A method that is not configured is
 * shown as unavailable rather than as a button that would fail on click.
 */
export function LoginForm({ google, email }: { google: boolean; email: boolean }) {
  const router = useRouter();
  const [emailValue, setEmailValue] = useState("");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!emailValue.trim()) return;
    setPending("email");
    setError(null);

    try {
      const result = await signIn("resend", { email: emailValue.trim(), redirect: false });
      if (result?.error) throw new Error("发送失败，请确认邮箱地址是否正确");
      router.push(`/login/check-email?email=${encodeURIComponent(emailValue.trim())}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发送失败，请稍后重试");
      setPending(null);
    }
  }

  if (!google && !email) {
    return (
      <Panel className="mt-8 flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/8 text-ink-200">
            <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 8v5M12 16.5v.5" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <p className="text-base font-medium text-ink-50">登录尚未配置</p>
        </div>
        <p className="text-nav leading-6 text-white/55">
          这是一个预览部署，还没有配置 Google OAuth 或邮件服务，所以暂时无法登录。
          模板库可以正常浏览，但生成作品需要一个账号。
        </p>
        <p className="text-micro leading-5 text-white/35">
          管理员需要设置 <code className="text-white/60">AUTH_GOOGLE_ID</code> /{" "}
          <code className="text-white/60">AUTH_GOOGLE_SECRET</code> 或{" "}
          <code className="text-white/60">AUTH_RESEND_KEY</code> 后重新部署。
        </p>
        <Link
          href="/#templates"
          className="text-nav text-white/70 underline-offset-2 hover:text-white hover:underline"
        >
          先去看看模板库
        </Link>
      </Panel>
    );
  }

  return (
    <Panel className="mt-8 flex flex-col gap-5 p-6">
      {google ? (
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
      ) : null}

      {google && email ? (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-micro text-white/35">或</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
      ) : null}

      {email ? (
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-micro text-white/50">邮箱地址</span>
            <input
              type="email"
              required
              value={emailValue}
              onChange={(event) => setEmailValue(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-11 rounded-panel bg-ink-800 px-4 text-base text-ink-100 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending !== null}>
            {pending === "email" ? "正在发送…" : "发送登录链接"}
          </Button>
        </form>
      ) : (
        <p className="text-micro leading-5 text-white/35">
          邮件登录尚未配置（缺少 <code className="text-white/60">AUTH_RESEND_KEY</code>）。
        </p>
      )}

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
