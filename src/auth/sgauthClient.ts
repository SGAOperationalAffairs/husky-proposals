import { createHash } from "node:crypto";
import { systemClock, type Clock } from "@/core/clock";
import { toSession, type Session } from "./contract";

// The SGAuth session client (#176). Only session.ts may import it (#177 wires
// it in); nothing else reads the SGAuth cookie or its response.
//
// Config is injected instead of read from env() because #177 owns adding
// SGAUTH_URL and SGAUTH_COOKIE_NAME to src/env.ts.
//
// Leader calls never read the cache and a failed call evicts the entry: leader
// actions fail closed and no stale answer is used on error (docs/sgauth-integration.md,
// "Stale data", #8). Students may use a 60-second cache.

export type SgauthConfig = { url: string; cookieName: string };
export type SessionPurpose = "student" | "leader";
export type SgauthSessionResult =
  | { ok: true; session: Session }
  | { ok: false; error: { code: "signed_out" | "sgauth_unavailable" | "invalid_session_response" } };

const STUDENT_CACHE_MS = 60_000;
const CACHE_LIMIT = 1_000;

// Visible ASCII without ; or , so a crafted value cannot add a second cookie
// to the header we forward.
const COOKIE_SAFE = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x7e]+$/;

function fail(code: "signed_out" | "sgauth_unavailable" | "invalid_session_response"): SgauthSessionResult {
  // Code only, never the status text, body, error object, or cookie.
  if (code !== "signed_out") console.error(`sgauth session: ${code}`);
  return { ok: false, error: { code } };
}

export function createSgauthClient({
  config,
  fetch: fetchImpl = globalThis.fetch,
  clock = systemClock,
  timeoutMs = 3000,
}: {
  config: SgauthConfig;
  fetch?: typeof fetch;
  clock?: Clock;
  timeoutMs?: number;
}) {
  // Keyed by a hash so raw tokens are never held as keys. Map keeps insert order.
  const cache = new Map<string, { session: Session; at: number }>();

  async function getSession(
    cookieValue: string | undefined,
    purpose: SessionPurpose,
  ): Promise<SgauthSessionResult> {
    if (!cookieValue || !COOKIE_SAFE.test(cookieValue)) {
      return { ok: false, error: { code: "signed_out" } };
    }

    const key = createHash("sha256").update(cookieValue).digest("hex");
    const now = clock.now().getTime();

    if (purpose === "student") {
      const hit = cache.get(key);
      if (hit && now - hit.at < STUDENT_CACHE_MS) return { ok: true, session: hit.session };
    }

    let res: Response;
    try {
      res = await fetchImpl(new URL("/api/sgauth/session", config.url), {
        method: "GET",
        headers: { Cookie: `${config.cookieName}=${cookieValue}`, Accept: "application/json" },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      cache.delete(key);
      return fail("sgauth_unavailable");
    }

    if (res.status === 401) {
      cache.delete(key);
      return fail("signed_out");
    }
    if (res.status !== 200) {
      cache.delete(key);
      return fail("sgauth_unavailable");
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      cache.delete(key);
      return fail("invalid_session_response");
    }

    const result = toSession(body);
    if (!result.ok) {
      cache.delete(key);
      return fail(result.error.code);
    }

    cache.delete(key);
    cache.set(key, { session: result.session, at: now });
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return { ok: true, session: result.session };
  }

  return { getSession };
}
