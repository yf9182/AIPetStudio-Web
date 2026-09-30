"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";

export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-[-1.4px] text-ink-50">出了点问题</h1>
      <p className="max-w-md text-nav leading-6 text-white/55">
        页面加载失败。可以重试一次，或者回到模板库。
      </p>
      {error.digest ? <p className="text-micro text-white/30">错误编号 {error.digest}</p> : null}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>
          重试
        </Button>
        <ButtonLink href="/" variant="secondary" size="lg">
          回到模板库
        </ButtonLink>
      </div>
    </Container>
  );
}
