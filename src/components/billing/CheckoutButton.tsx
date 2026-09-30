"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Starts a Stripe Checkout Session and sends the browser to Stripe.
 *
 * Signed-out visitors are routed to the login page first and returned here
 * afterwards, so a purchase is always attached to a wallet.
 */
export function CheckoutButton({
  kind,
  id,
  label,
  variant = "primary",
  size = "lg",
  className,
  disabled = false,
  disabledReason
}: {
  kind: "pack" | "plan";
  id: string;
  label: string;
  variant?: "primary" | "brand" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "authenticated") {
    return (
      <ButtonLink
        href="/login"
        variant={variant}
        size={size}
        className={cn("w-full", className)}
      >
        {label}
      </ButtonLink>
    );
  }

  if (disabled) {
    return (
      <div className="flex w-full flex-col gap-2">
        <Button variant="secondary" size={size} className={cn("w-full", className)} disabled>
          {label}
        </Button>
        {disabledReason ? <p className="text-[11px] text-white/40">{disabledReason}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        className={cn("w-full", className)}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const response = await fetch("/api/billing/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind, id })
            });
            const body = (await response.json()) as { url?: string; error?: { message?: string } };
            if (!response.ok || !body.url) {
              throw new Error(body.error?.message || "无法创建支付会话");
            }
            window.location.href = body.url;
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "无法创建支付会话");
            setPending(false);
            router.refresh();
          }
        }}
      >
        {pending ? "正在跳转…" : label}
      </Button>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}

/** Opens the Stripe Billing Portal for an existing subscriber. */
export function ManageSubscriptionButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="md"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const response = await fetch("/api/billing/portal", { method: "POST" });
            const body = (await response.json()) as { url?: string; error?: { message?: string } };
            if (!response.ok || !body.url) throw new Error(body.error?.message || "暂时无法打开订阅管理");
            window.location.href = body.url;
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "暂时无法打开订阅管理");
            setPending(false);
          }
        }}
      >
        {pending ? "正在打开…" : "管理订阅与发票"}
      </Button>
      {error ? <p className="text-[11px] text-white/50">{error}</p> : null}
    </div>
  );
}
