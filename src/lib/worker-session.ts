import { readAuthJwt } from "@/lib/auth-token";
import { deriveDeviceId } from "@/lib/identity";
import { bootstrapSession, refreshSession } from "@/lib/worker";

export class NotAuthenticatedError extends Error {
  constructor() {
    super("请先登录");
    this.name = "NotAuthenticatedError";
  }
}

export type WorkerSessionData = {
  /** Backend bearer token. Server-only. */
  token: string;
  /** `aipet_<device_id>` — the RevenueCat customer id. */
  customerId: string;
  /** Provider account id the wallet is derived from. */
  accountId: string;
};

/** Refresh slightly early so a request never races the 1 hour backend TTL. */
const REFRESH_SKEW_SECONDS = 120;

/**
 * Resolves the backend session for the signed-in account.
 *
 * The token normally comes from the Auth.js JWT, which the `jwt` callback fills
 * in during the sign-in round trip (a Route Handler, so it persists). When it
 * has expired — the backend TTL is one hour — this refreshes it for the current
 * request. That refresh is not written back when it happens during a Server
 * Component render, because Next.js forbids cookie writes there; the next
 * request that goes through a Route Handler re-persists it. The fallback is
 * therefore self-healing and costs at most one extra backend call.
 */
export async function getWorkerSession(): Promise<WorkerSessionData> {
  const session = await getWorkerSessionOrNull();
  if (!session) throw new NotAuthenticatedError();
  return session;
}

export async function getWorkerSessionOrNull(): Promise<WorkerSessionData | null> {
  const jwt = await readAuthJwt();
  const accountId = jwt?.accountId;
  if (!accountId) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const storedToken = jwt?.workerToken;
  const storedExpiry = jwt?.workerExpiresAt ?? 0;
  const customerId = jwt?.customerId ?? "";

  if (storedToken && storedExpiry - REFRESH_SKEW_SECONDS > nowSeconds) {
    return { token: storedToken, customerId, accountId };
  }

  // The backend issues identical access/refresh tokens today, but the refresh
  // endpoint is the documented rotation path, so prefer it when possible.
  if (storedToken) {
    try {
      const refreshed = await refreshSession(storedToken);
      return { token: refreshed.access_token, customerId: refreshed.customer_id, accountId };
    } catch {
      /* fall through to a fresh bootstrap */
    }
  }

  try {
    const session = await bootstrapSession(deriveDeviceId(accountId));
    return { token: session.access_token, customerId: session.customer_id, accountId };
  } catch (cause) {
    console.error("Unable to establish a backend session", cause);
    return null;
  }
}
