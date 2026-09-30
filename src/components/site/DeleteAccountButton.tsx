"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Account deletion.
 *
 * Two-step by design: the destructive call only runs after an explicit
 * confirmation, and the session is ended immediately afterwards.
 */
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button variant="danger" size="md" onClick={() => setConfirming(true)}>
        删除账号
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-panel bg-red-500/8 p-4">
      <p className="text-nav leading-6 text-red-200">
        删除后，账号下的积分余额、作品记录和上传的参考图都会被清除，且无法恢复。
        已经购买但未使用的积分不会退还。确定要继续吗？
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="danger"
          size="md"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              const response = await fetch("/api/worker/account", { method: "DELETE" });
              if (!response.ok) {
                const body = (await response.json()) as { error?: { message?: string } };
                throw new Error(body.error?.message || "删除失败，请稍后重试");
              }
              await signOut({ callbackUrl: "/" });
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "删除失败，请稍后重试");
              setPending(false);
            }
          }}
        >
          {pending ? "正在删除…" : "确认删除"}
        </Button>
        <Button variant="ghost" size="md" onClick={() => setConfirming(false)} disabled={pending}>
          取消
        </Button>
      </div>
      {error ? <p className="text-nav text-red-300">{error}</p> : null}
    </div>
  );
}
