import type { Session } from "@/auth/contract";
import type { BoardCode } from "@/core/boards";
import { isAuthor } from "@/core/permissions";
import { BOARD_FOR_CATEGORY, resubmitPostSchema } from "@/core/postIdea";
import { applyReviewEvent, withdrawInputSchema, type ReviewError, type ReviewStatus } from "@/core/review";
import { postFields, type PostFields } from "./submitPost";

// The author's two actions on their own post (#56): resubmit a declined post, or
// withdraw a pending or declined one. The rules, with the storage behind an interface.
// The server action (actions.ts) supplies the Prisma store inside one transaction; the
// tests supply a fake one. Authorship is permissions (#52) and what the post allows is
// the state machine (#50); this module joins them and builds the write.

export type OwnPostTarget = {
  id: string;
  authorId: string | null;
  reviewStatus: ReviewStatus;
  latestVersion: number;
};

// Only a declined post is resubmitted, so the write is guarded on that.
export type ResubmitWrite = {
  ideaId: string;
  from: "declined";
  patch: PostFields & { boardId: BoardCode; reviewStatus: "pending"; submittedAt: Date };
  // The new version of the post, so the next review points at exactly these words.
  revision: PostFields & { version: number; submittedAt: Date };
};

export type WithdrawWrite = { ideaId: string; from: "pending" | "declined" };

export type OwnPostStore = {
  find(ideaId: string): Promise<OwnPostTarget | null>;
  countPending(authorId: string): Promise<number>;
  // False when the post is no longer in `from`: it changed since the rules read it.
  resubmit(write: ResubmitWrite): Promise<boolean>;
  withdraw(write: WithdrawWrite): Promise<boolean>;
};

export type OwnPostError =
  { code: "invalid"; fields: string[] } | { code: "not_found" } | { code: "already_changed" } | ReviewError;

export type ResubmitResult = { ok: true; id: string; version: number } | { ok: false; error: OwnPostError };
export type WithdrawResult = { ok: true; id: string } | { ok: false; error: OwnPostError };

const fail = (error: OwnPostError): { ok: false; error: OwnPostError } => ({ ok: false, error });

// Missing and not-yours look the same, so a stranger learns nothing about a post,
// not even its status. The state machine would answer with the status otherwise.
async function findOwn(store: OwnPostStore, session: Session, ideaId: string) {
  const target = await store.find(ideaId);
  return target && isAuthor(session, target) ? target : null;
}

export async function resubmitPost(
  store: OwnPostStore,
  session: Session,
  raw: unknown,
  now: Date,
): Promise<ResubmitResult> {
  const parsed = resubmitPostSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return fail({ code: "invalid", fields });
  }
  const { ideaId, ...input } = parsed.data;

  const target = await findOwn(store, session, ideaId);
  if (!target) return fail({ code: "not_found" });

  const actorId = session.user.id;
  const result = applyReviewEvent(
    { reviewStatus: target.reviewStatus, authorId: target.authorId },
    { type: "resubmit", actorId, pendingCount: await store.countPending(actorId) },
  );
  if (!result.ok) return fail(result.error);

  // The board follows the category, as at posting. `fromSga` is set at posting and not touched.
  const fields = postFields(input);
  const version = target.latestVersion + 1;
  const changed = await store.resubmit({
    ideaId: target.id,
    from: "declined",
    patch: {
      ...fields,
      boardId: BOARD_FOR_CATEGORY[input.category],
      reviewStatus: "pending",
      submittedAt: now,
    },
    revision: { ...fields, version, submittedAt: now },
  });
  if (!changed) return fail({ code: "already_changed" });
  return { ok: true, id: target.id, version };
}

export async function withdrawPost(
  store: OwnPostStore,
  session: Session,
  raw: unknown,
): Promise<WithdrawResult> {
  const parsed = withdrawInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return fail({ code: "invalid", fields });
  }

  const target = await findOwn(store, session, parsed.data.ideaId);
  if (!target) return fail({ code: "not_found" });

  const result = applyReviewEvent(
    { reviewStatus: target.reviewStatus, authorId: target.authorId },
    { type: "withdraw", actorId: session.user.id },
  );
  if (!result.ok) return fail(result.error);

  // A withdrawal is not a review decision, so no review row is written (data model).
  // The state machine only allows it from pending or declined.
  const from = target.reviewStatus as "pending" | "declined";
  const changed = await store.withdraw({ ideaId: target.id, from });
  if (!changed) return fail({ code: "already_changed" });
  return { ok: true, id: target.id };
}
