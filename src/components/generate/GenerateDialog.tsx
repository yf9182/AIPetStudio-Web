"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { Template } from "@/lib/material-hub";
import { rememberGenerationSource } from "@/lib/recent-generation";
import { cn, formatCredits } from "@/lib/utils";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type Stage = "idle" | "uploading" | "ready" | "creating" | "error";

/**
 * Upload → confirm credits → create task.
 *
 * Nothing is charged until the user confirms, and the credit cost shown here is
 * the backend's fixed price (10 for image, 50 for video) rather than the
 * catalog's display price, because the backend is what actually charges.
 *
 * The component is mounted only while a template is selected, so its state
 * resets naturally on close instead of through a reset effect.
 */
export function GenerateDialog({
  template,
  onClose
}: {
  template: Template;
  onClose: () => void;
}) {
  const router = useRouter();
  const { status } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const cost = template.kind === "image" ? 10 : 50;

  useEffect(() => {
    return () => {
      // Release the local preview object URL when the dialog unmounts.
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { balance?: number };
        if (!cancelled) setBalance(typeof body.balance === "number" ? body.balance : null);
      } catch {
        /* balance is advisory here */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const upload = useCallback(async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setStage("error");
      setError("图片不能超过 15MB");
      return;
    }
    setStage("uploading");
    setError(null);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return objectUrl;
    });

    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/worker/upload", { method: "POST", body: form });
      const body = (await response.json()) as { asset_id?: string; error?: { message?: string } };
      if (!response.ok || !body.asset_id) {
        throw new Error(body.error?.message || "上传失败，请重试");
      }
      setAssetId(body.asset_id);
      setStage("ready");
    } catch (cause) {
      setStage("error");
      setError(cause instanceof Error ? cause.message : "上传失败，请重试");
    }
  }, []);

  const submit = useCallback(async () => {
    if (!assetId) return;
    setStage("creating");
    setError(null);

    try {
      const response = await fetch("/api/worker/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          input_asset_ids: [assetId],
          client_request_id: crypto.randomUUID()
        })
      });
      const body = (await response.json()) as { id?: string; error?: { code?: string; message?: string } };

      if (!response.ok || !body.id) {
        if (body.error?.code === "INSUFFICIENT_POINTS") {
          throw new Error(`积分不足，本次需要 ${cost} 积分。`);
        }
        throw new Error(body.error?.message || "创建任务失败，请重试");
      }

      // The backend never returns input assets on a task, so remember the pair
      // locally to power "generate again" on the result page.
      rememberGenerationSource(body.id, { templateId: template.id, assetId });

      onClose();
      router.push(`/tasks/${body.id}`);
    } catch (cause) {
      setStage("ready");
      setError(cause instanceof Error ? cause.message : "创建任务失败，请重试");
    }
  }, [template, assetId, cost, onClose, router]);


  const insufficient = balance !== null && balance < cost;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`使用模板 ${template.title}`}
      className="fixed inset-0 z-100 flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="animate-rise relative w-full max-w-lg rounded-t-panel-lg bg-ink-850 p-6 sm:rounded-panel-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-micro text-white/50">
              {template.kind === "image" ? "图生图" : "图生视频"} · 消耗 {cost} 积分
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.4px] text-ink-50">{template.title}</h2>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {status !== "authenticated" ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-nav leading-6 text-white/60">
              生成需要一个账号，用来保存积分和作品。登录后可以立即使用免费赠送的 20 积分。
            </p>
            <div className="flex gap-3">
              <ButtonLink href="/login" size="lg" className="flex-1">
                登录后继续
              </ButtonLink>
              <Button variant="outline" size="lg" onClick={onClose}>
                稍后再说
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <div>
              <p className="text-micro text-white/50">提示词</p>
              <p className="mt-2 max-h-28 overflow-y-auto rounded-panel bg-white/4 p-3 text-nav leading-6 text-white/75">
                {template.prompt}
              </p>
            </div>

            <div>
              <p className="text-micro text-white/50">参考图（1 张）</p>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) void upload(file);
                }}
                className={cn(
                  "mt-2 flex items-center gap-4 rounded-panel bg-white/4 p-3 transition-colors",
                  dragging && "bg-brand-soft"
                )}
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-panel bg-white/6">
                  {previewUrl ? (
                    // Local object URL preview; not routed through the optimizer.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="已选择的参考图" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-white/30">
                      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="3" y="4" width="18" height="16" rx="3" />
                        <path d="M3 15l4.5-4.5 4 4L15 11l6 6" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-nav text-ink-100">
                    {stage === "uploading"
                      ? "正在上传…"
                      : assetId
                        ? "参考图已就绪"
                        : "拖入或选择一张清晰的宠物照片"}
                  </p>
                  <p className="mt-1 text-micro text-white/40">JPEG / PNG / HEIC，最大 15MB</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => inputRef.current?.click()}
                      disabled={stage === "uploading" || stage === "creating"}
                    >
                      {assetId ? "重新选择" : "选择图片"}
                    </Button>
                  </div>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-panel bg-red-500/10 px-3 py-2.5 text-nav text-red-300">{error}</p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-nav text-white/50">
                {balance === null ? (
                  <>本次消耗 {cost} 积分</>
                ) : (
                  <>
                    余额 {formatCredits(balance)} · 本次消耗 {cost}
                  </>
                )}
              </p>
              <div className="flex gap-3">
                {insufficient ? (
                  <ButtonLink href="/points" size="lg" className="flex-1 sm:flex-none">
                    去充值
                  </ButtonLink>
                ) : (
                  <Button
                    variant="brand"
                    size="lg"
                    className="flex-1 sm:flex-none"
                    disabled={!assetId || stage === "uploading" || stage === "creating"}
                    onClick={() => void submit()}
                  >
                    {stage === "creating" ? "创建中…" : "开始生成"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
