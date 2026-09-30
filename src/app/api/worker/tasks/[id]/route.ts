import { NextResponse } from "next/server";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchTask, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";

/**
 * Polls one task. The Worker advances task state from the provider on each
 * request, so this is the endpoint that moves a generation forward.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const task = await fetchTask(session.token, id);
    return NextResponse.json(task);
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
