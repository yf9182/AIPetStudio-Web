import { NextResponse } from "next/server";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchMedia, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";

/**
 * Streams private R2 objects (user uploads and video thumbnails) that the
 * Worker serves behind `GET /v1/media/{key}` with a bearer token.
 *
 * Task responses point `thumbnail_url` at that endpoint, so the browser would
 * otherwise receive a 401. Range requests are forwarded so video seeking works.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "缺少 key 参数" } },
      { status: 422 }
    );
  }

  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  // Ownership is enforced by the Worker, which rejects any key that does not
  // start with `users/<authenticated user id>/`. The web layer deliberately
  // does not re-implement that check: it does not know the backend user id,
  // and duplicating the rule here would only risk diverging from it.

  try {
    const upstream = await fetchMedia(session.token, key, request.headers.get("range"));
    const headers = new Headers();
    for (const header of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(header);
      if (value) headers.set(header, value);
    }
    headers.set("cache-control", "private, max-age=300");
    return new Response(upstream.body, { status: upstream.status, headers });
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
