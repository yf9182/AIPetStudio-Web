import { mediaKeyFromUrl, type WorkerTask, type WorkerTaskState } from "@/lib/worker";

/** States the backend still advances; anything else is terminal. */
const ACTIVE_STATES: WorkerTaskState[] = ["created", "queueing", "queued", "processing"];

export function isActiveTask(state: WorkerTaskState): boolean {
  return ACTIVE_STATES.includes(state);
}

export const STATE_LABELS: Record<WorkerTaskState, string> = {
  created: "已创建",
  queueing: "排队中",
  queued: "排队中",
  processing: "生成中",
  succeeded: "已完成",
  failed: "生成失败"
};

/** Poll interval: image jobs finish quickly, video jobs take minutes. */
export function pollIntervalFor(kind: "image" | "video"): number {
  return kind === "video" ? 10_000 : 2_500;
}

/**
 * Rewrites Worker-hosted media into same-origin proxy URLs.
 *
 * The backend returns `{workerOrigin}/v1/media/{key}` for private objects (user
 * uploads, video thumbnails) and a direct provider CDN URL for finished
 * results. Only the former needs the bearer token, so only it is proxied.
 */
export function proxiedMediaUrl(url: string | null): string | null {
  const key = mediaKeyFromUrl(url);
  if (!key) return url;
  return `/api/media?key=${encodeURIComponent(key)}`;
}

export function taskThumbnail(task: WorkerTask): string | null {
  return proxiedMediaUrl(task.thumbnail_url);
}

export function taskResult(task: WorkerTask): string | null {
  // Successful results are direct CDN URLs and need no proxy.
  return task.media_url;
}

export function taskErrorMessage(task: WorkerTask): string {
  if (task.error_message) return task.error_message;
  switch (task.error_code) {
    case "VIDU_NOT_CONFIGURED":
      return "生成服务尚未配置，请联系管理员。";
    case "INSUFFICIENT_POINTS":
      return "积分不足。";
    default:
      return "生成失败，积分已退回。";
  }
}
