import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <p className="text-micro text-white/40">404</p>
      <h1 className="text-3xl font-bold tracking-[-1.4px] text-ink-50">页面不存在</h1>
      <p className="max-w-md text-nav leading-6 text-white/55">
        这个模板可能已经下架，或者链接不正确。
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          回到模板库
        </ButtonLink>
        <ButtonLink href="/tasks" variant="secondary" size="lg">
          我的作品
        </ButtonLink>
      </div>
    </Container>
  );
}
