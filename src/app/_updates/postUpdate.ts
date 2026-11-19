import type { Session } from "@/auth/contract";
import { BOARD_CODES, type BoardCode } from "@/core/boards";
import { can } from "@/core/permissions";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
import { CHECK_IN_BODY, UPDATE_BODY_MAX, hasPlaceholder, postUpdateInputSchema } from "@/core/updates";

// Posting a board update or the one-tap check-in (#130): the rules, with the storage behind
// an interface. The server action (actions.ts) supplies the Prisma store inside one
// transaction; the tests supply a fake one. Who may post is permissions (#52), "manage_status"
// on the idea's stored board, the same row as start, hold, and deliver (#98).

export type UpdateTarget = {
  id: string;
  number: number | null;
  boardId: string;
  reviewStatus: ReviewStatus;
  status: IdeaStatus | null;
};

export type UpdateUser = { id: string; email: string; displayName: string };

export type UpdateWrite = {
  ideaId: string;
  kind: "board" | "check_in";
  body: string;
  authorId: string;
  now: Date;
  // A board update emails followers; a check-in does not (a monthly "no news" email is noise).
  notify: boolean;
};

export type UpdateStore = {
  // Null unless the idea passes `isPublic`.
  find(ideaId: string): Promise<UpdateTarget | null>;
  // Copies the leader from the session: the update's author points at users.
  ensureUser(user: UpdateUser): Promise<void>;
  record(write: UpdateWrite): Promise<{ updateId: string }>;
};

export type PostUpdateError =
  | { code: "invalid"; fields: string[] }
  | { code: "body_placeholder" }
  | { code: "not_found" }
  | { code: "not_allowed" }
  | { code: "not_in_progress" };

export type PostUpdateResult =
  { ok: true; number: number; kind: "board" | "check_in" } | { ok: false; error: PostUpdateError };

const fail = (error: PostUpdateError): PostUpdateResult => ({ ok: false, error });

function isBoardCode(value: string): value is BoardCode {
  return (BOARD_CODES as string[]).includes(value);
}

export async function postUpdate(
  store: UpdateStore,
  session: Session,
  raw: unknown,
  now: Date,
): Promise<PostUpdateResult> {
  const parsed = postUpdateInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return fail({ code: "invalid", fields });
  }
  const { ideaId, kind } = parsed.data;

  const target = await store.find(ideaId);
  // Only an approved idea has a status and a number; anything else is not public.
  if (!target || target.reviewStatus !== "approved" || target.status === null || target.number === null) {
    return fail({ code: "not_found" });
  }
  // The board comes from the stored idea, never the request. An unknown code is a bad row:
  // fail closed.
  if (!isBoardCode(target.boardId) || !can(session, "manage_status", target.boardId)) {
    return fail({ code: "not_allowed" });
  }
  if (target.status !== "in_progress") return fail({ code: "not_in_progress" });

  let body = CHECK_IN_BODY;
  if (kind === "board") {
    body = (parsed.data.body ?? "").trim();
    if (body.length === 0 || body.length > UPDATE_BODY_MAX) return fail({ code: "invalid", fields: ["body"] });
    if (hasPlaceholder(body)) return fail({ code: "body_placeholder" });
  }

  const { id, email, name } = session.user;
  await store.ensureUser({ id, email, displayName: name });
  await store.record({ ideaId: target.id, kind, body, authorId: id, now, notify: kind === "board" });
  return { ok: true, number: target.number, kind };
}
