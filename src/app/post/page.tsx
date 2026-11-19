import { ChevronLeft } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { listWall } from "@/app/_ideas/data";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { PostForm } from "@/app/_post/PostForm";
import { POST_INTRO } from "@/app/_post/intro";
import { pendingCountFor } from "@/app/_post/pendingPosts";
import { toSimilarIdeas } from "@/app/_post/present";
import { getSession } from "@/auth/session";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { db } from "@/db/runtime";
import { prismaPostStore } from "@/db/postStore";
import { env } from "@/env";

// The post form (#55). The page is open to visitors on purpose: the signed-out draft flow
// (#181) depends on it, and sign-in is required at submit time. No site header here: a single "Back to ideas" link keeps the form the focus.
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
      {/* The count depends on who is signed in, so it is read per request inside a boundary (#96). */}
      <Suspense fallback={null}>
        <PostFormWithCount />
      </Suspense>
    </main>
  );
}

// A visitor still gets the form, and keeps a draft through sign-in (#181), so there is no
// sign-in gate here: they just get no count. Local runs and browser tests have no database
// (usesSampleIdeas): db() is never touched. The similar ideas come from the cached public
// wall (#55), so they are the same for everyone and add no query once the cache is warm.
async function PostFormWithCount() {
  await connection();
  const similarIdeas = toSimilarIdeas(await listWall());
  const session = await getSession();
  const pendingCount = usesSampleIdeas(env())
    ? session
      ? 0
      : null
    : await pendingCountFor(session, prismaPostStore(db()).countPending);
  return <PostForm pendingCount={pendingCount} similarIdeas={similarIdeas} />;
}
