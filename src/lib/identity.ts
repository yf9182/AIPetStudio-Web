import { createHash } from "node:crypto";

/**
 * Derives the backend `device_id` for a signed-in web account.
 *
 * The AI Pet Studio backend has no account system: `POST /v1/session/bootstrap`
 * turns any caller-supplied `device_id` into a stable user, and
 * `customer_id = "aipet_" + device_id`. Because that string is the only thing
 * identifying a wallet, it has to be:
 *
 *   1. stable — the same account must resolve to the same wallet on every login;
 *   2. unguessable — anyone who knows it can spend that wallet's credits.
 *
 * Hashing the provider account id together with `AUTH_SECRET` satisfies both.
 * The result is hex, which also fits RevenueCat's customer-id charset
 * (`^[0-9a-zA-Z_-]*$`) after the `aipet_` prefix is applied upstream.
 *
 * Consequence worth knowing: rotating `AUTH_SECRET` disconnects every web
 * account from its existing wallet.
 */
export function deriveDeviceId(accountId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required to derive a backend device id");
  }
  const digest = createHash("sha256").update(`aipetstudio-web:${accountId}:${secret}`).digest("hex");
  return `web_${digest.slice(0, 40)}`;
}

/** Stable, non-reversible display handle for an account (shown in settings). */
export function displayHandle(accountId: string): string {
  const digest = createHash("sha256").update(accountId).digest("hex");
  return digest.slice(0, 12);
}
