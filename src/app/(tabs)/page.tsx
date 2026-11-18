import { Suspense } from "react";
import { Reveal } from "@/components/Reveal";
import { WallPlaceholder } from "@/components/Placeholder";
import { Wall } from "../_ideas/Wall";
import { SubmitYours } from "@/components/SubmitYours";

// The ideas list (#61), from the playground's Ideas section (#29) and the
// prototype's student view. Anyone with the link can browse; no sign-in.
export default function Home() {
  return (
    <>
      {/* The title, with the way to post right under it (#55). The intro paragraph
          is gone: the posters say enough, and the forehead was too tall. */}
      <div className="flex flex-col gap-4">
        <h1 className="heading text-6xl @3xl:text-8xl">Ideas for campus</h1>
        <SubmitYours />
      </div>
      {/* The wall renders per request with the URL's filters, so it waits in a boundary. */}
      <Suspense
        fallback={
          <Reveal.Out>
            <WallPlaceholder />
          </Reveal.Out>
        }
      >
        <Reveal>
          <Wall />
        </Reveal>
      </Suspense>
    </>
  );
}
