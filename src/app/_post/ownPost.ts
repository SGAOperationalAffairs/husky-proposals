import type { Session } from "@/auth/contract";
import type { BoardCode } from "@/core/boards";
import { isAuthor } from "@/core/permissions";
import { applyEditEvent, editPostSchema, hasChanges, type EditError, type EditFields } from "@/core/postEdit";
import { BOARD_FOR_CATEGORY, resubmitPostSchema } from "@/core/postIdea";
import { applyReviewEvent, withdrawInputSchema, type ReviewError, type ReviewStatus } from "@/core/review";
import { invalidFields, postFields, type PostFields } from "./submitPost";

// The author's actions on their own post (#56, #295): resubmit a declined post, withdraw
// a pending or declined one, or edit an approved one. The rules, with the storage behind an interface.
// The server action (actions.ts) supplies the Prisma store inside one transaction; the
// tests supply a fake one. Authorship is permissions (#52) and what the post allows is
// the state machine (#50); this module joins them and builds the write.

export type OwnPostTarget = {
  id: string;
  authorId: string | null;
  reviewStatus: ReviewStatus;
  latestVersion: number;
  // An edit to an approved post waits for review (#295).
  editPending: boolean;
  // The words the idea row holds now, so an edit that changes nothing is refused (#295).
  approved: EditFields;
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

// An edit leaves the idea row as the approved version: it only marks that an edit waits,
// and the edit itself is the next revision (#295).
export type SubmitEditWrite = {
  ideaId: string;
  submittedAt: Date;
  revision: PostFields & { version: number; submittedAt: Date };
};

export type OwnPostStore = {
  find(ideaId: string): Promise<OwnPostTarget | null>;
  // The same per-author lock a new post takes, since a resubmit adds a pending post (#257).
  lockPendingPosts(authorId: string): Promise<void>;
  countPending(authorId: string): Promise<number>;
  // False when the post is no longer in `from`: it changed since the rules read it.
  resubmit(write: ResubmitWrite): Promise<boolean>;
  withdraw(write: WithdrawWrite): Promise<boolean>;
  // False when the post is no longer approved with no edit waiting (#295).
  submitEdit(write: SubmitEditWrite): Promise<boolean>;
};

export type OwnPostError =
  | { code: "invalid"; fields: string[] }
  | { code: "not_found" }
  | { code: "already_changed" }
  | { code: "no_changes" }
  | ReviewError
  | EditError;

export type ResubmitResult = { ok: true; id: string; version: number } | { ok: false; error: OwnPostError };
export type WithdrawResult = { ok: true; id: string } | { ok: false; error: OwnPostError };
export type SubmitEditResult = { ok: true; id: string; version: number } | { ok: false; error: OwnPostError };

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
  if (!parsed.success) return fail({ code: "invalid", fields: invalidFields(parsed.error) });
  const { ideaId, ...input } = parsed.data;

  const target = await findOwn(store, session, ideaId);
  if (!target) return fail({ code: "not_found" });

  const actorId = session.user.id;
  await store.lockPendingPosts(actorId);
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

// An author's edit to an approved post (#295). The post stays approved and public as it
// was; the edit waits for a reviewer. It does not count toward the pending-posts limit,
// because it is not a pending post.
export async function submitEdit(
  store: OwnPostStore,
  session: Session,
  raw: unknown,
  now: Date,
): Promise<SubmitEditResult> {
  const parsed = editPostSchema.safeParse(raw);
  if (!parsed.success) return fail({ code: "invalid", fields: invalidFields(parsed.error) });
  const { ideaId, ...input } = parsed.data;

  const target = await findOwn(store, session, ideaId);
  if (!target) return fail({ code: "not_found" });

  const result = applyEditEvent(
    { reviewStatus: target.reviewStatus, authorId: target.authorId, editPending: target.editPending },
    { type: "submit_edit", actorId: session.user.id },
  );
  if (!result.ok) return fail(result.error);

  // The board follows the category when a reviewer approves, not now (postEdit.ts).
  const fields = postFields(input);
  if (!hasChanges(target.approved, fields)) return fail({ code: "no_changes" });

  const version = target.latestVersion + 1;
  const changed = await store.submitEdit({
    ideaId: target.id,
    submittedAt: now,
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
  if (!parsed.success) return fail({ code: "invalid", fields: invalidFields(parsed.error) });

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
