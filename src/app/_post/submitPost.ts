import type { Session } from "@/auth/contract";
import type { BoardCode } from "@/core/boards";
import { BOARD_FOR_CATEGORY, parsePostIdea, type PostIdeaInput } from "@/core/postIdea";
import { isSgaLeader } from "@/core/positions";
import { checkNewPost, PENDING_LIMIT } from "@/core/review";

// Posting an idea (#54): the rules for a new post, with the storage behind an
// interface. The server action (actions.ts) supplies the Prisma store; the tests
// supply a fake one. A post is always pending: the review step decides what shows.

// The words of a post, as students wrote them.
export type PostFields = {
  title: string;
  description: string;
  fullText: string | null;
  category: PostIdeaInput["category"];
  location: string | null;
  scale: PostIdeaInput["scale"];
  costBand: PostIdeaInput["costBand"];
  timeHorizon: PostIdeaInput["timeHorizon"];
  isAnonymous: boolean;
};

// Maps the form's names to the stored ones. Shared with resubmit (#56), so a
// resubmitted post is read the same way as a new one.
export function postFields(input: PostIdeaInput): PostFields {
  return {
    title: input.title,
    description: input.summary,
    fullText: input.details,
    category: input.category,
    location: input.location,
    scale: input.scale,
    costBand: input.costBand,
    timeHorizon: input.timeHorizon,
    isAnonymous: input.anonymous,
  };
}

export type NewPost = PostFields & {
  boardId: BoardCode;
  authorId: string;
  fromSga: boolean;
  reviewStatus: "pending";
  submittedAt: Date;
  // The first version of the post, so a review points at exactly what was submitted.
  revision: PostFields & { version: 1; submittedAt: Date };
};

export type PostStore = {
  countPending(authorId: string): Promise<number>;
  // Writes the author's account (copied from SGAuth) and the post in one transaction.
  create(author: { id: string; email: string; displayName: string }, post: NewPost): Promise<{ id: string }>;
};

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; error: { code: "signed_out" } }
  | { ok: false; error: { code: "invalid"; fields: string[] } }
  | { ok: false; error: { code: "pending_limit"; limit: number } };

export async function submitPost(
  store: PostStore,
  session: Session | null,
  raw: unknown,
  now: Date,
): Promise<SubmitResult> {
  if (!session) return { ok: false, error: { code: "signed_out" } };

  const parsed = parsePostIdea(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, error: { code: "invalid", fields } };
  }
  const input = parsed.data;

  const limit = checkNewPost(await store.countPending(session.user.id));
  if (!limit.ok) return { ok: false, error: { code: "pending_limit", limit: PENDING_LIMIT } };

  const boardId = BOARD_FOR_CATEGORY[input.category];
  const shared = postFields(input);
  const { id } = await store.create(
    { id: session.user.id, email: session.user.email, displayName: session.user.name },
    {
      ...shared,
      boardId,
      authorId: session.user.id,
      // "From SGA" comes from the author's positions at posting (data model).
      fromSga: isSgaLeader(session.roles),
      reviewStatus: "pending",
      submittedAt: now,
      revision: { ...shared, version: 1, submittedAt: now },
    },
  );
  return { ok: true, id };
}
