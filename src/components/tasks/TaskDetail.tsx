"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Layout";
import { isActiveTask, pollIntervalFor, STATE_LABELS, taskErrorMessage, taskResult, taskThumbnail } from "@/lib/tasks";
import { useGenerationSource } from "@/lib/recent-generation";
import type { WorkerTask } from "@/lib/worker";
import { cn, formatCredits, formatDate } from "@/lib/utils";

/**
 * Generation progress and result.
 *
 * The backend advances a task only when `GET /v1/tasks/{id}` is called, so this
 * polls until the task reaches a terminal state.
 */
export function TaskDetail({ initial }: { initial: WorkerTask }) {
  const router = useRouter();
  const [task, setTask] = useState(initial);
  const [recreating, setRecreating] = useState(false);
  const [recreateError, setRecreateError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read from sessionStorage through an external-store subscription so no
  // state copy is needed and SSR/hydration stay consistent.
  const source = useGenerationSource(initial.id);

  const active = isActiveTask(task.state);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(`/api/worker/tasks/${encodeURIComponent(task.id)}`, {
        cache: "no-store"
      });
      if (response.status === 404) return;
      if (!response.ok) return;
      const next = (await response.json()) as WorkerTask;
      setTask(next);
    } catch {
      /* transient; the next tick retries */
    }
  }, [task.id]);

  useEffect(() => {
    if (!active) return;
    timer.current = setTimeout(() => void poll(), pollIntervalFor(task.kind));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, task.kind, task.progress, task.state, poll]);

  // A finished run changes the balance, so refresh server-rendered data once.
  useEffect(() => {
    if (active) return;
    router.refresh();
  }, [active, router]);

  const thumbnail = taskThumbnail(task);
  const result = taskResult(task);
  const succeeded = task.state === "succeeded" && Boolean(result);

  async function regenerate() {
    if (!source) return;
    setRecreating(true);
    setRecreateError(null);
    try {
      const response = await fetch("/api/worker/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: source.templateId,
          input_asset_ids: [source.assetId],
          client_request_id: crypto.randomUUID()
        })
      });
      const body = (await response.json()) as { id?: string; error?: { code?: string; message?: string } };
      if (!response.ok || !body.id) {
        if (body.error?.code === "INSUFFICIENT_POINTS") {
          throw new Error("积分不足，请先充值。");
        }
        if (body.error?.code === "NOT_FOUND") {
          throw new Error("参考图已过期，请回到模板重新上传。");
        }
        throw new Error(body.error?.message || "重新生成失败");
      }
      router.push(`/tasks/${body.id}`);
    } catch (cause) {
      setRecreateError(cause instanceof Error ? cause.message : "重新生成失败");
      setRecreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
      <div className="min-w-0 flex-1">
        <div className="relative overflow-hidden rounded-panel-lg bg-white/4">
          {succeeded ? (
            task.kind === "video" ? (
              <video src={result!} className="w-full" controls playsInline loop preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- provider CDN result URL
              <img src={result!} alt={task.template_title || "生成结果"} className="w-full" />
            )
          ) : (
            <div className="relative flex aspect-4/3 w-full items-center justify-center">
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- proxied Worker media
                <img src={thumbnail} alt="" className="absolute inset-0 size-full object-cover opacity-25" />
              ) : null}
              <div className="relative z-2 flex flex-col items-center gap-4 px-6 text-center">
                {task.state === "failed" ? (
                  <>
                    <span className="flex size-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                      <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 8v5M12 16.5v.5" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>
                    <p className="text-base font-medium text-ink-50">生成失败</p>
                    <p className="max-w-sm text-nav text-white/55">{taskErrorMessage(task)}</p>
                  </>
                ) : (
                  <>
                    <Spinner />
                    <p className="text-base font-medium text-ink-50">{STATE_LABELS[task.state]}</p>
                    <p className="text-nav text-white/50">
                      {task.kind === "video"
                        ? "图生视频通常需要几分钟，可以先离开这个页面。"
                        : "图生图通常一两分钟完成。"}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {active ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-brand transition-[width] duration-700"
                style={{ width: `${Math.max(4, task.progress)}%` }}
              />
            </span>
            <span className="w-10 text-right text-micro tabular-nums text-white/50">{task.progress}%</span>
          </div>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[360px]">
        <div>
          <p className="text-micro text-white/45">
            {task.kind === "image" ? "图生图" : "图生视频"} · {STATE_LABELS[task.state]}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.8px] text-ink-50">
            {task.template_title || "自定义任务"}
          </h1>
        </div>

        <Panel className="flex flex-col gap-3 p-4">
          <Row label="消耗积分" value={`${formatCredits(task.points)}`} />
          <Row label="创建时间" value={formatDate(task.created_at)} />
          <Row label="最近更新" value={formatDate(task.updated_at)} />
          <Row label="任务编号" value={task.id.slice(0, 12)} mono />
        </Panel>

        <div className="flex flex-col gap-3">
          {succeeded ? (
            <a
              href={result!}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink-50 px-4 text-base font-medium text-black transition-colors hover:bg-white"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
              </svg>
              {task.kind === "video" ? "下载视频" : "下载图片"}
            </a>
          ) : null}

          {source ? (
            <Button variant="secondary" size="lg" disabled={recreating} onClick={() => void regenerate()}>
              {recreating ? "正在重新生成…" : "再生成一次"}
            </Button>
          ) : (
            <ButtonLink href="/#templates" variant="secondary" size="lg">
              换个模板再生成
            </ButtonLink>
          )}

          <ButtonLink href="/tasks" variant="ghost" size="md">
            返回我的作品
          </ButtonLink>
        </div>

        {recreateError ? (
          <p className="rounded-panel bg-red-500/10 px-3 py-2.5 text-nav text-red-300">{recreateError}</p>
        ) : null}

        {!source && succeeded ? (
          <p className="text-micro leading-5 text-white/35">
            参考图只在创建任务的浏览器会话里保留，这里没有找到记录。
            <Link href="/#templates" className="ml-1 text-white/60 underline-offset-2 hover:underline">
              回到模板库
            </Link>
            可以重新上传同一张照片。
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-nav text-white/45">{label}</span>
      <span className={cn("text-nav text-ink-100", mono && "font-mono text-micro")}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-9 animate-spin rounded-full border-2 border-white/15 border-t-brand"
    />
  );
}
