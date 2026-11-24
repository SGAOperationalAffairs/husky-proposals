import { NextResponse, type NextRequest } from "next/server";
import { sessionFromCookies } from "@/auth/sessionFromCookies";
import { isLeaderRoute, leaderMayEnter } from "@/core/leaderAccess";

// Answers 404 to anyone who is not a leader on a leader page, before anything renders (#235).
// The page's requireLeader() stays the authoritative check. Without this, the shared tab
// layout streams a 200 before the page's check runs.
//
// Fail closed on these routes only: the matcher keeps every other route out of here, so
// an error cannot touch them. SGAuth being slow or down is not "not a leader", so it
// passes through and the page's requireLeader() decides, as it does today. Otherwise a
// slow SGAuth would turn into a 404 for a real leader.

// One entry per leader route, written out because matcher values must be static literals.
// src/proxy.test.ts fails if this list drifts from LEADER_ROUTES. Prefetches skip the
// proxy, so a leader's visible tabs do not add an SGAuth call each per page view.
// The config must be one static literal: Next's build analysis rejects a spread or a
// shared constant inside it as an invalid segment configuration.
export const config = {
  matcher: [
    {
      source: "/queue",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/people",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/updates",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

// A leading underscore makes an App Router private folder, so no route can ever exist at
// this path. Rewriting to it renders Next's own not-found page with a real 404, the same
// way /stand-in is a 404 in a production build (#235).
const HIDDEN_PATH = "/_leader-route-hidden";

function hidden(request: NextRequest): NextResponse {
  const response = NextResponse.rewrite(new URL(HIDDEN_PATH, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Server actions post to these pages and keep their own withSession checks.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  if (!isLeaderRoute(request.nextUrl.pathname)) return NextResponse.next();
  try {
    const { session, problem } = await sessionFromCookies(
      (name) => request.cookies.get(name)?.value,
      "leader",
    );
    if (problem) return NextResponse.next();
    if (leaderMayEnter(session?.roles ?? null)) return NextResponse.next();
  } catch {
    // Never log the error object: it could carry a cookie or a response body.
    console.error("proxy: leader check failed");
  }
  return hidden(request);
}
