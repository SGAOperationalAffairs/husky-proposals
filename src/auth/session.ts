import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "@/env";
import { toSession, type Session } from "./contract";
import { createSgauthClient } from "./sgauthClient";
import { STAND_IN_COOKIE, standInResponse } from "./standIn";

// The one module the rest of the app calls to learn who is signed in (#45).
// Swapping in @sgaoperations/sgauth (T2.5) changes this file only. Nothing
// outside src/auth/ reads the stand-in cookie or standIn.ts, except the
// stand-in page and its actions.
//
// Calling cookies() makes the caller dynamic. Under cacheComponents, a
// component that calls getSession() must sit inside <Suspense>, and its page
// is never cached (CLAUDE.md, "Explicit caching only").

// SGAuth's answers on #177: sign-in is GET /login?redirect=<absolute URL on an active
// registry origin>, sign-out is GET /logout?redirect=<same>, and the value is capped at
// 2 KB. SGAuth falls back to its own home page for anything else.
const SGAUTH_SIGN_IN_PATH = "/login";
const SGAUTH_SIGN_OUT_PATH = "/logout";
const SGAUTH_RETURN_PARAM = "redirect";
const SGAUTH_RETURN_MAX = 2048;
// The origins active in SGAuth's registry. Add proposals-dev here when it is
// registered (T2.5). Anything else, a *.vercel.app preview included, gets no sign-in.
const SGAUTH_RETURN_ORIGINS: readonly string[] = ["https://dev.proposals.northeasternsga.com"];

// Built on first use. This is the only importer of sgauthClient.ts (#176).
let sgauthClient: ReturnType<typeof createSgauthClient> | undefined;
function client() {
  sgauthClient ??= createSgauthClient({
    config: { url: env().SGAUTH_URL!, cookieName: env().SGAUTH_COOKIE_NAME! },
  });
  return sgauthClient;
}

// Memoized per request (#156): the tabs and a leader page both ask, and the cookie
// is read once. Server actions and later requests get a fresh read.
// The SGAuth failures worth showing on dev and preview (#191). Codes only, never a body.
export type SessionProblem = "sgauth_unavailable" | "invalid_session_response";

const readSession = cache(async (): Promise<{ session: Session | null; problem: SessionProblem | null }> => {
  if (env().AUTH_SGAUTH) {
    const jar = await cookies();
    // Every call is live (purpose "leader") for the spike, so no leader check can run
    // on a cached answer; T2.5 passes a purpose so students use the 60-second cache.
    // Any failure is signed out, so leader access fails closed. The client logs its
    // own codes, so nothing is logged here.
    const result = await client().getSession(jar.get(env().SGAUTH_COOKIE_NAME!)?.value, "leader");
    if (result.ok) return { session: result.session, problem: null };
    const code = result.error.code;
    return { session: null, problem: code === "signed_out" ? null : code };
  }
  if (!env().AUTH_STAND_IN) return { session: null, problem: null };
  const jar = await cookies();
  const result = toSession(standInResponse(jar.get(STAND_IN_COOKIE)?.value, new Date()));
  if (result.ok) return { session: result.session, problem: null };
  // standInResponse gives null for no cookie or an unknown one, which is
  // signed out. Log only the code, never the body.
  if (jar.get(STAND_IN_COOKIE)) console.error(`getSession: ${result.error.code}`);
  return { session: null, problem: null };
});

export async function getSession(): Promise<Session | null> {
  return (await readSession()).session;
}

// Why SGAuth could not answer, or null: success, signed out, and the stand-in are all null.
// The root layout's error floater reports it, so every page shows it (#191).
export async function sessionProblem(): Promise<SessionProblem | null> {
  return (await readSession()).problem;
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

// Where we ask SGAuth to send the browser back to: our own origin plus a path, only
// when the origin is registered. This is the check before anything is sent; SGAuth's
// registry check (#43) is the second guard. `path` is always a safeNextPath result or "/".
function sgauthReturnUrl(path: string, origin: string): string | null {
  if (!SGAUTH_RETURN_ORIGINS.includes(origin)) return null;
  const url = new URL(path, origin).href;
  return url.length > SGAUTH_RETURN_MAX ? `${origin}/` : url;
}

// Where sign-in starts, or null when nothing can sign you in. SGAuth's login on
// dev, the stand-in picker locally. `origin` is this request's origin. Only /sign-in calls it (#93).
export function signInUrl(next: string, origin: string): string | null {
  if (env().AUTH_SGAUTH) {
    const returnUrl = sgauthReturnUrl(next, origin);
    if (returnUrl === null) return null;
    const url = new URL(SGAUTH_SIGN_IN_PATH, env().SGAUTH_URL);
    url.searchParams.set(SGAUTH_RETURN_PARAM, returnUrl);
    return url.href;
  }
  if (!env().AUTH_STAND_IN) return null;
  return `/stand-in?next=${encodeURIComponent(next)}`;
}

// SGAuth's sign-out link, or null when SGAuth is off or the origin is not registered.
// It is a link and not an action: SGAuth signs out on a top-level same-site
// navigation only, so a prefetch or a script cannot do it. SGAuth clears its own cookie.
export function signOutUrl(origin: string): string | null {
  if (!env().AUTH_SGAUTH) return null;
  const returnUrl = sgauthReturnUrl("/", origin);
  if (returnUrl === null) return null;
  const url = new URL(SGAUTH_SIGN_OUT_PATH, env().SGAUTH_URL);
  url.searchParams.set(SGAUTH_RETURN_PARAM, returnUrl);
  return url.href;
}

// Whether any sign-in exists in this build. The header shows an account control only then.
export function canSignIn(): boolean {
  return env().AUTH_STAND_IN || env().AUTH_SGAUTH;
}

// Ends the stand-in session only. SGAuth sign-out is signOutUrl, and SGAuth clears
// its own cookie, so we never delete it.
export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(STAND_IN_COOKIE);
}
