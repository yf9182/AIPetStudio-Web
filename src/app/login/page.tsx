import { LoginForm } from "@/components/site/LoginForm";
import { Container } from "@/components/ui/Layout";
import { authProviderAvailability } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "登录" };

export default function LoginPage() {
  // Availability is resolved on the server so the form never renders a button
  // for a provider this deployment has no credentials for.
  const availability = authProviderAvailability();

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-[400px]">
        <h1 className="text-3xl font-bold tracking-[-1.4px] text-ink-50 sm:text-headline">登录</h1>
        <p className="mt-3 text-nav leading-6 text-white/55">
          登录后即可生成作品、保存积分并查看历史记录。首次登录赠送 20 积分。
        </p>

        <LoginForm google={availability.google} email={availability.email} />
      </div>
    </Container>
  );
}
