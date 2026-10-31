import { cookies } from "next/headers";
import { env } from "@/env";
import { toSession, type Session } from "./contract";
import { STAND_IN_COOKIE, standInResponse } from "./standIn";

// The one module the rest of the app calls to learn who is signed in (#45).
// Swapping in @sgaoperations/sgauth (T2.5) changes this file only. Nothing
// outside src/auth/ reads the stand-in cookie or standIn.ts, except the
// stand-in page and its actions.
//
// Calling cookies() makes the caller dynamic. Under cacheComponents, a
// component that calls getSession() must sit inside <Suspense>, and its page
// is never cached (CLAUDE.md, "Explicit caching only").

export async function getSession(): Promise<Session | null> {
  if (!env().AUTH_STAND_IN) {
    // T2.5 forwards the SGAuth cookie here. Leader actions must fail closed on
    // a stale answer (docs/sgauth-integration.md, "Stale data").
    return null;
  }
  const jar = await cookies();
  const result = toSession(standInResponse(jar.get(STAND_IN_COOKIE)?.value, new Date()));
  if (result.ok) return result.session;
  // standInResponse gives null for no cookie or an unknown one, which is
  // signed out. Log only the code, never the body.
  if (jar.get(STAND_IN_COOKIE)) console.error(`getSession: ${result.error.code}`);
  return null;
}

export async function startStandInSession(
  slug: string,
): Promise<{ ok: true } | { ok: false; error: { code: "stand_in_off" } }> {
  if (!env().AUTH_STAND_IN) return { ok: false, error: { code: "stand_in_off" } };
  const jar = await cookies();
  // No maxAge, so the session ends with the browser session.
  jar.set(STAND_IN_COOKIE, slug, { httpOnly: true, sameSite: "lax", path: "/" });
  return { ok: true };
}

// T2.5 replaces this with SGAuth's sign-out.
export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(STAND_IN_COOKIE);
}
