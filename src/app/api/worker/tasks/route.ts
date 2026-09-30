import { NextResponse } from "next/server";
import { fetchCatalog, type Template } from "@/lib/material-hub";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { createTask, fetchTasks, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";

/** GET /api/worker/tasks — task history for the signed-in account. */
export async function GET(request: Request) {
  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor") || undefined;

  try {
    const page = await fetchTasks(session.token, {
      limit: limit ? Number(limit) : undefined,
      cursor
    });
    return NextResponse.json(page);
  } catch (cause) {
    if (cause instanceof WorkerError) {
      return NextResponse.json(
        { error: { code: cause.code, message: cause.message } },
        { status: cause.status }
      );
    }
    throw cause;
  }
}

/**
 * POST /api/worker/tasks — creates a generation task.
 *
 * The client sends only the template id and the uploaded asset ids. The
 * `material_snapshot` the backend charges against is rebuilt here from the
 * server-side catalog, so a caller cannot lower the price or swap in an
 * arbitrary prompt by editing the request body.
 */
export async function POST(request: Request) {
  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  let body: { template_id?: unknown; input_asset_ids?: unknown; client_request_id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "请求格式不正确" } }, { status: 422 });
  }

  const templateId = typeof body.template_id === "string" ? body.template_id.trim() : "";
  if (!templateId) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "缺少模板" } }, { status: 422 });
  }

  const assetIds = Array.isArray(body.input_asset_ids)
    ? body.input_asset_ids.filter((value): value is string => typeof value === "string")
    : [];
  if (assetIds.length !== 1) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "该模板需要上传 1 张参考图" } },
      { status: 422 }
    );
  }

  const clientRequestId =
    typeof body.client_request_id === "string" && body.client_request_id.trim()
      ? body.client_request_id.trim().slice(0, 120)
      : crypto.randomUUID();

  let template: Template | undefined;
  try {
    const catalog = await fetchCatalog();
    template = catalog.templates.find((item) => item.id === templateId);
  } catch (cause) {
    console.error("Catalog lookup failed while creating a task", cause);
    return NextResponse.json(
      { error: { code: "CATALOG_UNAVAILABLE", message: "素材目录暂时不可用，请稍后重试" } },
      { status: 502 }
    );
  }

  if (!template) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "模板不存在或已下架" } }, { status: 404 });
  }

  try {
    const task = await createTask(session.token, {
      templateId: template.id,
      snapshot: {
        material_id: template.id,
        title: template.title,
        kind: template.kind,
        prompt: template.prompt,
        image_count: 1,
        source_updated_at: template.updatedAt
      },
      assetIds,
      clientRequestId
    });
    return NextResponse.json(task, { status: 201 });
  } catch (cause) {
    if (cause instanceof WorkerError) {
      return NextResponse.json(
        { error: { code: cause.code, message: cause.message } },
        { status: cause.status }
      );
    }
    throw cause;
  }
}
