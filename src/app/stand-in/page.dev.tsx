import type { Metadata } from "next";
import { Suspense } from "react";
import { getSession } from "@/auth/session";
import { STAND_IN_USERS } from "@/auth/standIn";
import { env } from "@/env";
import { signInAs, signOut } from "./actions";
import { StandInPanel } from "./StandInPanel";

export const metadata: Metadata = { title: "Sign-in stand-in" };

async function Current() {
  const session = await getSession();
  return (
    <StandInPanel
      enabled={env().AUTH_STAND_IN}
      session={session}
      users={STAND_IN_USERS}
      signInAs={signInAs}
      signOut={signOut}
    />
  );
}

// Dev-only (.dev.tsx): pick a test user and see what their session grants (#45).
export default function StandIn() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="heading text-6xl">Sign-in stand-in</h1>
        <p className="mt-3 text-muted">
          For local development and tests only. Pick a test user to act as them. Real sign-in through SGAuth
          replaces this page.
        </p>
      </div>
      {/* getSession reads cookies, so the panel renders per request inside a boundary. */}
      <Suspense fallback={<p className="text-muted">Loading</p>}>
        <Current />
      </Suspense>
    </main>
  );
}
