import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { SiteHeader } from "@/components/SiteHeader";

// No approved idea has this number (#62). The same words whether the number never
// existed or belongs to a post still in review, so pending posts stay private.
// Streamed after the page's shell, so the status is 200; Next adds noindex.
export default function IdeaNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 @lg:px-8 @lg:py-12">
      <SiteHeader />
      <section className="flex max-w-prose flex-col gap-3 p-card surface-float">
        <h1 className="heading text-4xl">No idea with that number</h1>
        <p>Check the link, or look through all the ideas.</p>
        <Button variant="text" href="/" transitionTypes={PAGE} className="self-start">
          See all ideas
        </Button>
      </section>
    </main>
  );
}
