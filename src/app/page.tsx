import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Wall } from "./_ideas/Wall";

// The ideas list (#61), from the playground's Ideas section (#29) and the
// prototype's student view. Anyone with the link can browse; no sign-in.
export default function Home() {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 @lg:px-8 @lg:py-12">
      <SiteHeader current="ideas" />
      <div>
        <h1 className="heading text-6xl @3xl:text-8xl">Ideas for campus</h1>
        <p className="mt-3 max-w-prose text-muted">
          Every poster is an idea a student posted. Support the ones you care about, or offer to help. Support
          helps SGA decide; it is not a vote.
        </p>
      </div>
      {/* The wall renders per request with the URL's filters, so it waits in a boundary. */}
      <Suspense fallback={<p className="text-muted">Loading ideas</p>}>
        <Wall list="open" path="/" />
      </Suspense>
    </main>
  );
}
