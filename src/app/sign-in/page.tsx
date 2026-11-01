import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signInDestination } from "@/auth/gate";
import { SignInClosed } from "./SignInClosed";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

// The session and the query are per request, so they are read inside a boundary.
async function Destination({ searchParams }: Props) {
  const { next } = await searchParams;
  const to = await signInDestination(typeof next === "string" ? next : undefined);
  if (to) redirect(to);
  return <SignInClosed />;
}

// The one place that knows how sign-in starts (#93). The SGAuth ticket (103) changes this route
// and src/auth/ to point at SGAuth.
export default function SignIn({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <main aria-busy="true" className="mx-auto w-full max-w-2xl px-4 py-8">
          <p className="text-muted">Checking sign-in</p>
        </main>
      }
    >
      <Destination searchParams={searchParams} />
    </Suspense>
  );
}
