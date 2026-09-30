import { cookies } from "next/headers";
import { getToken, type JWT } from "next-auth/jwt";

/**
 * Reads the raw Auth.js session JWT on the server.
 *
 * `auth()` only returns the public session object, and the Worker bearer token
 * deliberately is not part of it: `/api/auth/session` hands the session to the
 * browser, so anything placed there is readable by client JavaScript. The token
 * therefore lives in the encrypted Auth.js JWT and is read here instead.
 *
 * This is the only module that touches `getToken`, so replacing the mechanism
 * later is a single-file change.
 */
const SECURE_COOKIE = "__Secure-authjs.session-token";
const PLAIN_COOKIE = "authjs.session-token";

export async function readAuthJwt(): Promise<JWT | null> {
  const store = await cookies();
  const name = store.has(SECURE_COOKIE) ? SECURE_COOKIE : store.has(PLAIN_COOKIE) ? PLAIN_COOKIE : null;
  if (!name) return null;

  const value = store.get(name)?.value;
  if (!value) return null;

  try {
    return await getToken({
      // `getToken` accepts a header bag; a cookie header is enough for it to
      // find and decrypt the session JWT.
      req: { headers: { cookie: `${name}=${value}` } },
      secret: process.env.AUTH_SECRET,
      cookieName: name,
      salt: name,
      secureCookie: name === SECURE_COOKIE
    });
  } catch {
    return null;
  }
}
