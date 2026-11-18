import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireSignedIn } from "@/auth/gate";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { EditPostView } from "@/app/_post/EditPostView";
import { toEditPost, type EditPostData } from "@/app/_post/present";
import { SAMPLE_OWN_POST } from "@/app/_post/sample";
import { Button } from "@/components/Button";
import { PAGE } from "@/components/pageTransition";
import { ownPostById } from "@/db/ownPost";
import { db } from "@/db/runtime";
import { prismaPostStore } from "@/db/postStore";
import { env } from "@/env";

// Edit and resubmit a post the review sent back (#128). Keyed by the idea's id, not its
// number: a post that was declined and never approved has no number. Only the author can
// open it; anyone else, a missing post, and a malformed id all get the not-found page.
// Never cached: it depends on who is signed in. The shell streams with a 200 before
// notFound() can run, so only the layout and the way back sit outside the boundary, and
// everything that names the page renders after the author check (#158).
export default function EditPostPage({ params }: PageProps<"/me/ideas/[id]/edit">) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <Button
        variant="text"
        href="/me"
        transitionTypes={PAGE}
        className="self-start"
        icon={<ChevronLeft aria-hidden className="size-4" />}
      >
        Back to my ideas
      </Button>
      <Suspense fallback={null}>
        <EditPost params={params} />
      </Suspense>
    </main>
  );
}

async function EditPost({ params }: { params: PageProps<"/me/ideas/[id]/edit">["params"] }) {
  await connection();
  const { id } = await params;
  const session = await requireSignedIn(`/me/ideas/${id}/edit`);
  const { data, pendingCount } = await read(session, id);
  return <EditPostView data={data} pendingCount={pendingCount} />;
}

// Local runs and browser tests have no database (usesSampleIdeas): one invented declined
// post, and db() is never touched.
async function read(
  session: Awaited<ReturnType<typeof requireSignedIn>>,
  id: string,
): Promise<{ data: EditPostData; pendingCount: number }> {
  if (usesSampleIdeas(env())) {
    if (id !== SAMPLE_OWN_POST.ideaId) notFound();
    return { data: SAMPLE_OWN_POST, pendingCount: 1 };
  }
  const viewer = { user: { id: session.user.id }, roles: session.roles };
  const [idea, pendingCount] = await Promise.all([
    ownPostById(db(), viewer, id),
    prismaPostStore(db()).countPending(session.user.id),
  ]);
  if (!idea) notFound();
  return { data: toEditPost(idea), pendingCount };
}
