import { NextResponse } from "next/server";
import { getWorkerSessionOrNull } from "@/lib/worker-session";
import { fetchWallet, WorkerError } from "@/lib/worker";

export const dynamic = "force-dynamic";

/** Lightweight wallet read used by the header credits pill and the points page. */
export async function GET() {
  const session = await getWorkerSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  try {
    const wallet = await fetchWallet(session.token);
    return NextResponse.json({
      balance: wallet.balance,
      entitlement: wallet.entitlement,
      welcome_bonus_granted: wallet.welcome_bonus_granted,
      welcome_bonus_points: wallet.welcome_bonus_points,
      customer_id: session.customerId
    });
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
