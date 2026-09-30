import { NextResponse } from "next/server";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { deleteAccount, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";

/**
 * Deletes the backend account and everything attached to it.
 *
 * The backend soft-deletes the user row, clears translation outputs and expires
 * its tasks. The Auth.js session is not touched here; the client signs out
 * immediately afterwards so the two never drift apart.
 */
export async function DELETE() {
  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  try {
    const result = await deleteAccount(session.token);
    return NextResponse.json(result);
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
