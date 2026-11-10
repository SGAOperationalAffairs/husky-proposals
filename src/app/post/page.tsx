import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { PostForm } from "@/app/_post/PostForm";
import { POST_INTRO } from "@/app/_post/intro";

// The post form (#55). Students will sign in before they see it; the gate waits
// for the sign-in stand-in to reach pages (#45), so for now the page is open.
// No site header here: a single "Back to ideas" link keeps the form the focus.
export default function PostPage() {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <Button
        variant="text"
        href="/"
        transitionTypes={PAGE}
        className="self-start"
        icon={<ChevronLeft aria-hidden className="size-4" />}
      >
        Back to ideas
      </Button>
      <header className="flex flex-col gap-3">
        <h1 className="heading text-6xl @3xl:text-8xl">Post an idea</h1>
        <p className="text-muted">{POST_INTRO.short}</p>
      </header>
      {/* TODO(#96): the signed-in student's pending count comes from the viewer shape (#53). */}
      <PostForm pendingCount={0} />
    </main>
  );
}
