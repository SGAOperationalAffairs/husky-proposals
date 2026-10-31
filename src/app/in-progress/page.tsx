import { Suspense } from "react";
import { Wall } from "@/app/_ideas/Wall";
import { SiteHeader } from "@/components/SiteHeader";

// The In progress list (#63): ideas a board has taken on, in progress or
// delivered, so students see what boards are working on.
export default function InProgress() {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 @lg:px-8 @lg:py-12">
      <SiteHeader current="progress" />
      <div>
        <h1 className="heading text-6xl @3xl:text-8xl">In progress</h1>
        <p className="mt-3 max-w-prose text-muted">
          Ideas a board is working on, and ideas it has delivered. Boards usually work on 1 to 2 ideas at a
          time. Ideas that are waiting stay on the Ideas list and keep their support.
        </p>
      </div>
      {/* The wall renders per request with the URL's filters, so it waits in a boundary. */}
      <Suspense fallback={<p className="text-muted">Loading ideas</p>}>
        <Wall list="progress" path="/in-progress" />
      </Suspense>
    </main>
  );
}
