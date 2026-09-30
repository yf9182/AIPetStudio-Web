import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { deriveDeviceId } from "@/lib/identity";
import { bootstrapSession } from "@/lib/worker";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string;
    } & DefaultSession["user"];
    /** RevenueCat/backend customer id (`aipet_<device_id>`). Safe to show. */
    customerId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string;
    provider?: string;
    customerId?: string;
    /** Backend bearer token. Server-only: never copied into the session. */
    workerToken?: string;
    /** Unix seconds. */
    workerExpiresAt?: number;
  }
}

/** Refresh a little before expiry so an in-flight request never races the TTL. */
const REFRESH_SKEW_SECONDS = 120;

const providers: Provider[] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    allowDangerousEmailAccountLinking: true
  })
];

/**
 * Email magic link.
 *
 * The stock Auth.js email provider uses nodemailer (raw SMTP), which cannot run
 * on Cloudflare Workers. Auth.js ships a Resend provider that talks to the
 * Resend HTTP API instead, so that is the base here — with the generic Auth.js
 * template replaced by a branded one.
 */
if (process.env.AUTH_RESEND_KEY) {
  const resend = Resend({
    apiKey: process.env.AUTH_RESEND_KEY,
    from: process.env.EMAIL_FROM || "AI Pet Studio <login@example.com>"
  });

  resend.sendVerificationRequest = async ({ identifier, url, provider }) => {
    const host = new URL(url).host;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: provider.from,
        to: identifier,
        subject: `登录 AI Pet Studio`,
        html: magicLinkEmail({ url, host }),
        text: `登录 AI Pet Studio\n\n点击下面的链接完成登录（15 分钟内有效）：\n${url}\n\n如果不是你本人操作，请忽略这封邮件。`
      })
    });

    if (!response.ok) {
      throw new Error(`Resend rejected the magic link (${response.status})`);
    }
  };

  providers.push(resend);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", verifyRequest: "/login/check-email", error: "/login" },
  // The app runs behind Cloudflare's proxy, so the Host header is authoritative.
  trustHost: true,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accountId = user.id ?? account.providerAccountId;
        token.provider = account.provider;
      }

      if (!token.accountId) return token;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const needsSession =
        !token.workerToken || !token.workerExpiresAt || token.workerExpiresAt - REFRESH_SKEW_SECONDS < nowSeconds;

      if (needsSession) {
        try {
          const session = await bootstrapSession(deriveDeviceId(token.accountId));
          token.workerToken = session.access_token;
          token.workerExpiresAt = nowSeconds + session.expires_in;
          token.customerId = session.customer_id;
        } catch (cause) {
          // A backend outage must not lock the user out of the site; pages that
          // need the wallet surface the error themselves.
          console.error("Backend session bootstrap failed", cause);
        }
      }

      return token;
    },
    session({ session, token }) {
      // Only non-secret fields cross into the public session object.
      session.user.id = token.accountId ?? "";
      session.user.handle = (token.accountId ?? "").slice(-8);
      session.customerId = token.customerId ?? null;
      return session;
    }
  }
});

function magicLinkEmail({ url, host }: { url: string; host: string }): string {
  return `<!doctype html>
<html lang="zh-CN"><body style="margin:0;background:#000;padding:40px 0;font-family:Inter,-apple-system,'Segoe UI',sans-serif;color:#fafafa">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:16px;padding:32px">
      <tr><td style="font-size:20px;font-weight:600;letter-spacing:-0.4px;padding-bottom:8px">登录 AI Pet Studio</td></tr>
      <tr><td style="font-size:14px;line-height:22px;color:rgba(255,255,255,0.6);padding-bottom:24px">
        点击下面的按钮完成登录。链接 15 分钟内有效，且只能使用一次。
      </td></tr>
      <tr><td align="center" style="padding-bottom:24px">
        <a href="${url}" style="display:inline-block;background:#0075ff;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:11px 22px;border-radius:9999px">登录</a>
      </td></tr>
      <tr><td style="font-size:12.5px;line-height:19px;color:#737373;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">
        按钮无法点击时，请复制下面的链接到浏览器打开：<br>
        <span style="color:rgba(255,255,255,0.5);word-break:break-all">${url}</span><br><br>
        如果不是你本人操作，请忽略这封邮件。此邮件由 ${host} 发出。
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
