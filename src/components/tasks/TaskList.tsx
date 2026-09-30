"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Layout";
import { isActiveTask, STATE_LABELS, taskThumbnail } from "@/lib/tasks";
import type { WorkerTask, WorkerTaskList } from "@/lib/worker";
import { cn, formatCredits, formatRelative } from "@/lib/utils";

type Filter = "all" | "image" | "video";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" }
];

/**
 * Task history.
 *
 * The backend only advances a task when it is polled, so while any task is
 * still running this list re-reads itself on an interval.
 */
export function TaskList({ initial }: { initial: WorkerTaskList }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/worker/tasks?limit=50", { cache: "no-store" });
      if (!response.ok) return;
      setData((await response.json()) as WorkerTaskList);
    } catch {
      /* keep the previous page on a transient failure */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasActive = data.items.some((task) => isActiveTask(task.state));
    if (!hasActive) return;

    // Poll at the fastest cadence any visible task needs.
    const interval = data.items.some((task) => isActiveTask(task.state) && task.kind === "video")
      ? 10_000
      : 2_500;

    timer.current = setTimeout(() => {
      setLoading(true);
      void refresh();
    }, interval);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, refresh]);

  const visible = data.items.filter((task) => filter === "all" || task.kind === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <Chip key={item.value} active={filter === item.value} onClick={() => setFilter(item.value)}>
              {item.label}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <p className="text-micro text-white/40">
            共 {data.summary.total_count} 个作品 · {data.summary.image_count} 图片 ·{" "}
            {data.summary.video_count} 视频
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
            className="text-micro text-white/50 transition-colors hover:text-white"
          >
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={data.items.length === 0 ? "还没有作品" : "没有符合条件的作品"}
          description={
            data.items.length === 0
              ? "挑一个模板、上传一张宠物照片，几十秒后作品就会出现在这里。"
              : "试试切换筛选条件。"
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((task) => (
            <TaskTile key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskTile({ task }: { task: WorkerTask }) {
  const thumbnail = taskThumbnail(task);
  const active = isActiveTask(task.state);
  const failed = task.state === "failed";

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group relative flex flex-col overflow-hidden rounded-card bg-white/3 transition-transform duration-300 ease-out hover:scale-[1.02]"
    >
      <div className="relative aspect-3/4 w-full overflow-hidden bg-white/4">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- proxied Worker media, host varies
          <img
            src={thumbnail}
            alt={task.template_title || "作品"}
            loading="lazy"
            className={cn(
              "size-full object-cover transition-opacity duration-300",
              active && "opacity-45"
            )}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-white/25">
            <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M3 15l4.5-4.5 4 4L15 11l6 6" />
            </svg>
          </span>
        )}

        <span aria-hidden className="slight-outline absolute inset-0 z-2 rounded-card" />

        <span
          className={cn(
            "absolute top-2 left-2 z-4 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm",
            failed
              ? "bg-red-500/25 text-red-100"
              : active
                ? "bg-black/60 text-white/85"
                : "bg-black/55 text-white/85"
          )}
        >
          {STATE_LABELS[task.state]}
          {active && task.progress > 0 ? ` ${task.progress}%` : ""}
        </span>

        <span className="absolute top-2 right-2 z-4 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white/75 backdrop-blur-sm">
          {task.kind === "image" ? "图" : "视频"}
        </span>

        {active ? (
          <span className="absolute inset-x-0 bottom-0 z-4 h-0.5 bg-white/15">
            <span
              className="block h-full bg-brand transition-[width] duration-500"
              style={{ width: `${Math.max(4, task.progress)}%` }}
            />
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 px-3 py-3">
        <p className="line-clamp-1 text-nav font-medium text-ink-100">
          {task.template_title || "自定义任务"}
        </p>
        <p className="text-[11px] text-white/40">
          {formatCredits(task.points)} 积分 · {formatRelative(task.created_at)}
        </p>
      </div>
    </Link>
  );
}
