import { env } from "@/env";
import { toSession, type Session } from "./contract";
import { createSgauthClient, type SessionPurpose } from "./sgauthClient";
import { STAND_IN_COOKIE, standInResponse } from "./standIn";

// The session read with no framework in it (#235). session.ts passes the cookie jar
// from next/headers, and src/proxy.ts passes request.cookies, so both ask SGAuth the
// same way. Nothing here imports next/* or react: the proxy runs outside a render, where
// cookies(), connection(), and cache() are not available.

// The SGAuth failures worth showing on dev and preview (#191). Codes only, never a body.
export type SessionProblem = "sgauth_unavailable" | "invalid_session_response";

export type SessionRead = { session: Session | null; problem: SessionProblem | null };

// Built on first use. This is the only importer of sgauthClient.ts (#176). The proxy
// bundle is separate from the app's, so it builds its own instance. Harmless: leader
// calls never read the client's cache.
let sgauthClient: ReturnType<typeof createSgauthClient> | undefined;
function client() {
  sgauthClient ??= createSgauthClient({
    config: { url: env().SGAUTH_URL!, cookieName: env().SGAUTH_COOKIE_NAME! },
  });
  return sgauthClient;
}

export async function sessionFromCookies(
  readCookie: (name: string) => string | undefined,
  purpose: SessionPurpose,
): Promise<SessionRead> {
  if (env().AUTH_SGAUTH) {
    // Any failure is signed out, so leader access fails closed. The client logs its
    // own codes, so nothing is logged here.
    const result = await client().getSession(readCookie(env().SGAUTH_COOKIE_NAME!), purpose);
    if (result.ok) return { session: result.session, problem: null };
    const code = result.error.code;
    return { session: null, problem: code === "signed_out" ? null : code };
  }
  if (!env().AUTH_STAND_IN) return { session: null, problem: null };
  const cookie = readCookie(STAND_IN_COOKIE);
  const result = toSession(standInResponse(cookie, new Date()));
  if (result.ok) return { session: result.session, problem: null };
  // standInResponse gives null for no cookie or an unknown one, which is
  // signed out. Log only the code, never the body.
  if (cookie) console.error(`getSession: ${result.error.code}`);
  return { session: null, problem: null };
}
