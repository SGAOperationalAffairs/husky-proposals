import { redirect } from "next/navigation";
import { safeNextPath } from "@/core/nextPath";
import type { Session } from "./contract";
import { getSession, signInUrl } from "./session";

// The sign-in gate (#93). Authorization here is the session only: roles are
// checked by the caller through can(). Only /sign-in and src/auth/ know how
// sign-in starts.

export type SignedOut = { ok: false; error: { code: "signed_out" } };

// For a signed-in page, inside <Suspense> (it reads cookies through
// getSession). A server component cannot read its own URL, so the page passes
// its path. Signed out is a redirect, never an error page.
export async function requireSignedIn(path: string): Promise<Session> {
  const session = await getSession();
  if (session) return session;
  redirect(`/sign-in?next=${encodeURIComponent(safeNextPath(path) ?? "/")}`);
}

// For a signed-in server action. Signed out is an expected result the form can
// show, not a throw. The session is checked on every call, before the action
// validates its input.
export function withSession<A extends unknown[], R>(
  action: (session: Session, ...args: A) => Promise<R>,
): (...args: A) => Promise<R | SignedOut> {
  return async (...args) => {
    const session = await getSession();
    if (!session) return { ok: false, error: { code: "signed_out" } };
    return action(session, ...args);
  };
}

// What /sign-in does with a request: where to send it, or null when nothing
// can sign you in. `rawNext` is untrusted.
export async function signInDestination(rawNext: string | undefined): Promise<string | null> {
  const next = safeNextPath(rawNext) ?? "/";
  if (await getSession()) return next;
  return signInUrl(next);
}
