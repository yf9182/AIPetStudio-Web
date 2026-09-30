/**
 * Server-side client for the AI Pet Studio backend Worker.
 *
 * Every call in this file is made from the server. The browser never sees the
 * Worker JWT — it lives inside the encrypted Auth.js session cookie — which is
 * why the web client proxies `/api/worker/*` instead of calling the Worker
 * directly the way the iOS app does.
 *
 * The Worker contract is fixed; nothing here invents fields.
 */

export type WorkerTaskState =
  | "created"
  | "queueing"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

export type WorkerTask = {
  id: string;
  state: WorkerTaskState;
  kind: "image" | "video";
  template_id: string | null;
  template_title: string | null;
  points: number;
  progress: number;
  retry_count: number;
  artwork_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  media_url: string | null;
  thumbnail_url: string | null;
};

export type WorkerTaskList = {
  items: WorkerTask[];
  next_cursor: string | null;
  summary: {
    total_count: number;
    image_count: number;
    video_count: number;
    template_count: number;
  };
};

export type WorkerTransaction = {
  id: string;
  amount: number;
  reason: string;
  reference: string;
  created_at: string;
};

export type WorkerWallet = {
  balance: number;
  entitlement: string | null;
  welcome_bonus_granted: boolean;
  welcome_bonus_points: number;
  transactions: WorkerTransaction[];
};

export type WorkerSession = {
  access_token: string;
  refresh_token: string;
  customer_id: string;
  expires_in: number;
};

export type WorkerErrorCode =
  | "UNAUTHORIZED"
  | "INSUFFICIENT_POINTS"
  | "POINTS_PROVIDER_ERROR"
  | "CONFIGURATION_ERROR"
  | "VALIDATION"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR";

export class WorkerError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "WorkerError";
    this.code = code;
    this.status = status;
  }
}

export type MaterialSnapshot = {
  material_id: string;
  title: string;
  kind: "image" | "video";
  prompt: string;
  image_count: number;
  source_updated_at: string | null;
};

export function workerBaseUrl(): string {
  const base = (process.env.WORKER_BASE_URL || "").replace(/\/+$/, "");
  if (!base) {
    throw new WorkerError("WORKER_BASE_URL is not configured", 503, "CONFIGURATION_ERROR");
  }
  return base;
}

type WorkerRequestOptions = {
  token?: string;
  method?: string;
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
};

async function workerFetch(path: string, options: WorkerRequestOptions = {}): Promise<Response> {
  const url = new URL(`${workerBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  return fetch(url, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal ?? AbortSignal.timeout(30_000),
    cache: "no-store"
  });
}

async function readError(response: Response, fallbackCode: string): Promise<WorkerError> {
  let message = `后端服务返回 ${response.status}`;
  let code = fallbackCode;
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.message) message = body.error.message;
    if (body.error?.code) code = body.error.code;
  } catch {
    /* non-JSON error body */
  }
  return new WorkerError(message, response.status, code);
}

async function workerJson<T>(
  path: string,
  options: WorkerRequestOptions = {},
  fallbackCode = "UPSTREAM_ERROR"
): Promise<T> {
  let response: Response;
  try {
    response = await workerFetch(path, options);
  } catch (cause) {
    throw new WorkerError(
      cause instanceof Error && cause.name === "TimeoutError"
        ? "后端服务响应超时"
        : "无法连接后端服务",
      504,
      "UPSTREAM_ERROR"
    );
  }

  if (!response.ok) throw await readError(response, fallbackCode);
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function bootstrapSession(deviceId: string): Promise<WorkerSession> {
  return workerJson<WorkerSession>(
    "/v1/session/bootstrap",
    { method: "POST", body: { device_id: deviceId } },
    "CONFIGURATION_ERROR"
  );
}

export async function refreshSession(refreshToken: string): Promise<WorkerSession> {
  return workerJson<WorkerSession>(
    "/v1/session/refresh",
    { method: "POST", body: { refresh_token: refreshToken } },
    "UNAUTHORIZED"
  );
}

export async function fetchMe(token: string): Promise<{ id: string; customer_id: string }> {
  return workerJson<{ id: string; customer_id: string }>("/v1/me", { token }, "UNAUTHORIZED");
}

export async function deleteAccount(token: string): Promise<{ ok: boolean }> {
  return workerJson<{ ok: boolean }>("/v1/me", { token, method: "DELETE" }, "UNAUTHORIZED");
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export async function fetchWallet(token: string): Promise<WorkerWallet> {
  return workerJson<WorkerWallet>("/v1/wallet", { token }, "POINTS_PROVIDER_ERROR");
}

export async function fetchWalletTransactions(token: string): Promise<WorkerTransaction[]> {
  const body = await workerJson<{ items: WorkerTransaction[] }>(
    "/v1/wallet/transactions",
    { token },
    "UNAUTHORIZED"
  );
  return body.items ?? [];
}

/** Reconciles the wallet after returning from Stripe Checkout. */
export async function reconcileWallet(token: string): Promise<WorkerWallet> {
  return workerJson<WorkerWallet>("/v1/wallet/reconcile", { token, method: "POST" }, "POINTS_PROVIDER_ERROR");
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export async function uploadImage(
  token: string,
  file: File
): Promise<{ asset_id: string; url: string }> {
  const form = new FormData();
  form.set("file", file);
  return workerJson<{ asset_id: string; url: string }>(
    "/v1/uploads/images",
    { token, method: "POST", form },
    "VALIDATION"
  );
}

export async function deleteUpload(token: string, assetId: string): Promise<void> {
  await workerJson<{ ok: boolean }>(
    "/v1/uploads/images",
    { token, method: "DELETE", body: { asset_id: assetId } },
    "NOT_FOUND"
  );
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function createTask(
  token: string,
  input: {
    templateId: string | null;
    snapshot: MaterialSnapshot;
    assetIds: string[];
    clientRequestId: string;
  }
): Promise<WorkerTask> {
  return workerJson<WorkerTask>(
    "/v1/tasks",
    {
      token,
      method: "POST",
      body: {
        template_id: input.templateId ?? "",
        material_snapshot: input.snapshot,
        input_asset_ids: input.assetIds,
        client_request_id: input.clientRequestId
      }
    },
    "VALIDATION"
  );
}

export async function fetchTask(token: string, taskId: string): Promise<WorkerTask> {
  return workerJson<WorkerTask>(`/v1/tasks/${encodeURIComponent(taskId)}`, { token }, "NOT_FOUND");
}

export async function fetchTasks(
  token: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<WorkerTaskList> {
  return workerJson<WorkerTaskList>(
    "/v1/tasks",
    {
      token,
      query: {
        limit: options.limit ? String(options.limit) : undefined,
        cursor: options.cursor
      }
    },
    "UNAUTHORIZED"
  );
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/**
 * Fetches a private upload/thumbnail object from the Worker.
 *
 * `taskResponse` builds `thumbnail_url` as `{workerOrigin}/v1/media/{key}`,
 * which is JWT protected. Those URLs are rewritten to `/api/media` so the
 * browser can render them without holding the token.
 */
export async function fetchMedia(token: string, key: string, range?: string | null): Promise<Response> {
  const url = new URL(`${workerBaseUrl()}/v1/media/${encodeURIComponent(key)}`);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (range) headers.Range = range;

  let response: Response;
  try {
    response = await fetch(url, { headers, cache: "no-store" });
  } catch {
    throw new WorkerError("无法读取媒体文件", 504, "UPSTREAM_ERROR");
  }
  if (!response.ok && response.status !== 206) {
    throw await readError(response, "NOT_FOUND");
  }
  return response;
}

/** Extracts the R2 object key from a Worker `/v1/media/...` URL. */
export function mediaKeyFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = "/v1/media/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

/** True for media that is served straight from the generation provider CDN. */
export function isPublicMediaUrl(url: string | null): boolean {
  if (!url) return false;
  return !mediaKeyFromUrl(url);
}
