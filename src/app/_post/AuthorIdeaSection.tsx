import { getSession } from "@/auth/session";
import { AuthorIdeaPanel } from "@/components/AuthorIdeaPanel";
import { ownPostByNumber } from "@/db/ownPost";
import { db } from "@/db/runtime";
import { env } from "@/env";
import { parseIdeasNumber } from "@/app/_ideas/data";
import { usesSampleIdeas } from "@/app/_ideas/source";

// The author's panel on their own approved idea's page (#295). Like LeaderIdeaSection, it
// sits in its own <Suspense> boundary outside the cached idea read: the session is read per
// request and the author read is never cached, so the public part stays identical for
// everyone. It renders nothing for anyone but the author, and nothing without a database.
export async function AuthorIdeaSection({ params }: { params: PageProps<"/ideas/[number]">["params"] }) {
  const number = parseIdeasNumber((await params).number);
  if (number === undefined || usesSampleIdeas(env())) return null;

  const session = await getSession();
  if (!session) return null;
  const viewer = { user: { id: session.user.id }, roles: session.roles };
  const idea = await ownPostByNumber(db(), viewer, number);
  if (!idea) return null;

  return <AuthorIdeaPanel ideaId={idea.id} edit={idea.edit?.state ?? "none"} />;
}
