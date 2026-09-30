"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Post-Checkout reconciliation.
 *
 * The credits are granted by the backend's Stripe webhook, which may land a few
 * seconds after the browser returns. This polls the wallet with backoff so the
 * page shows the new balance without the user having to reload, then refreshes
 * the server-rendered balance.
 */
export function CheckoutReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "waiting" | "done" | "timeout">("idle");

  const outcome = params.get("checkout");

  useEffect(() => {
    if (outcome !== "success") return;

    let cancelled = false;
    const delays = [0, 1500, 3000, 5000, 8000, 12000];

    void (async () => {
      setState("waiting");
      for (const delay of delays) {
        if (cancelled) return;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled) return;

        try {
          const response = await fetch("/api/wallet", { cache: "no-store" });
          if (!response.ok) continue;
          const body = (await response.json()) as { balance?: number };
          if (typeof body.balance === "number") {
            setState("done");
            router.refresh();
            return;
          }
        } catch {
          /* retry */
        }
      }
      if (!cancelled) setState("timeout");
    })();

    return () => {
      cancelled = true;
    };
  }, [outcome, router]);

  if (outcome === "cancelled") {
    return (
      <Notice tone="neutral">
        已取消支付，没有产生扣款。
      </Notice>
    );
  }

  if (outcome !== "success") return null;

  if (state === "timeout") {
    return (
      <Notice tone="neutral">
        支付已完成，积分到账可能有延迟。稍后刷新页面即可看到最新余额；若长时间未到账请联系支持。
      </Notice>
    );
  }

  return (
    <Notice tone="success">
      {state === "done" ? "支付成功，积分已到账。" : "支付成功，正在为你同步积分…"}
    </Notice>
  );
}

function Notice({ tone, children }: { tone: "success" | "neutral"; children: React.ReactNode }) {
  return (
    <p
      className={
        tone === "success"
          ? "rounded-panel bg-brand-soft px-4 py-3 text-nav text-white"
          : "rounded-panel bg-white/6 px-4 py-3 text-nav text-white/70"
      }
      role="status"
    >
      {children}
    </p>
  );
}
