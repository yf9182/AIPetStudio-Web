import { NextResponse } from "next/server";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { uploadImage, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";
// Uploads stream through this route, so allow the Worker's 15 MiB body limit
// plus multipart overhead.
export const maxDuration = 30;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Proxies a reference image to the backend.
 *
 * The browser cannot call the Worker directly because the bearer token is
 * server-side only, so the multipart body is forwarded from here.
 */
export async function POST(request: Request) {
  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "请求格式不正确" } }, { status: 422 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "请选择要上传的图片" } }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "图片不能超过 15MB" } }, { status: 413 });
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "仅支持 JPEG、PNG、HEIC 格式" } },
      { status: 415 }
    );
  }

  try {
    const uploaded = await uploadImage(session.token, file);
    return NextResponse.json(uploaded, { status: 201 });
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
