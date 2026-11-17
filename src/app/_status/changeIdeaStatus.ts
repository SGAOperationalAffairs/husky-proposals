import type { Session } from "@/auth/contract";
import { startHeadsUp } from "@/core/boardLoad";
import { BOARD_CODES, type BoardCode } from "@/core/boards";
import {
  changeStatus,
  deliverInputSchema,
  holdInputSchema,
  normalizeHoldReason,
  startInputSchema,
  type StatusError,
  type StatusPatch,
  type SystemUpdate,
} from "@/core/ideaStatus";
import { can } from "@/core/permissions";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
import type { IdeaEvent } from "@/email/ideaEvent";

// Start, hold, and deliver an approved idea (#98): the rules, with the storage behind
// an interface. The server action (actions.ts) supplies the Prisma store inside one
// transaction; the tests supply a fake one. Who may change a board's ideas is
// permissions (#52) and what a status allows is src/core/ideaStatus.ts (#51); this
// module joins them and builds the write.

export type StatusTarget = {
  id: string;
  number: number | null;
  boardId: string;
  reviewStatus: ReviewStatus;
  status: IdeaStatus | null;
  waitingReason: string | null;
  scale: string | null;
  // The board's soft in-progress guideline (a heads-up, never a block).
  guideline: number;
};

export type StatusWrite = {
  ideaId: string;
  // The status the rules read. The write applies only if the idea is still in it.
  from: IdeaStatus;
  patch: StatusPatch;
  update: SystemUpdate;
  // Exactly one status event and never an update event, so followers get one email
  // for the change (#101).
  event: Extract<IdeaEvent, { kind: "status" }>;
};

export type StatusStore = {
  find(ideaId: string): Promise<StatusTarget | null>;
  // The scales of the board's approved, in progress ideas.
  boardLoad(boardId: string): Promise<(string | null)[]>;
  // Null when the idea is no longer in `from`: someone else changed it first.
  record(write: StatusWrite): Promise<{ updateId: string } | null>;
};

export type StatusType = "start" | "hold" | "deliver";

export type ChangeStatusError =
  | { code: "invalid"; fields: string[] }
  | { code: "not_found" }
  | { code: "not_allowed" }
  | { code: "heads_up"; inProgress: number; guideline: number }
  | { code: "already_changed" }
  | StatusError;

export type ChangeStatusResult =
  { ok: true; status: IdeaStatus; number: number | null } | { ok: false; error: ChangeStatusError };

const fail = (error: ChangeStatusError): ChangeStatusResult => ({ ok: false, error });

function isBoardCode(value: string): value is BoardCode {
  return (BOARD_CODES as string[]).includes(value);
}

const TARGET_STATUS: Record<StatusType, IdeaStatus> = {
  start: "in_progress",
  hold: "waiting",
  deliver: "delivered",
};

export async function changeIdeaStatus(
  store: StatusStore,
  session: Session,
  type: StatusType,
  raw: unknown,
  now: Date,
): Promise<ChangeStatusResult> {
  const input = parseInput(type, raw);
  if (!input.ok) return fail({ code: "invalid", fields: input.fields });

  const target = await store.find(input.ideaId);
  // Only an approved idea has a status; anything else is not public, so not found.
  if (!target || target.reviewStatus !== "approved" || target.status === null) {
    return fail({ code: "not_found" });
  }
  // The board comes from the stored idea, never the request. An unknown code is a bad
  // row: fail closed.
  if (!isBoardCode(target.boardId) || !can(session, "manage_status", target.boardId)) {
    return fail({ code: "not_allowed" });
  }

  // changeStatus lets a held idea take a new reason, which is not a hold. Hold from
  // waiting is refused here (data-model gap 3 keeps in_progress to waiting out too).
  if (type === "hold" && target.status === "waiting") {
    return fail({ code: "same_status", status: "waiting" });
  }

  const changed = changeStatus(
    { status: target.status, waitingReason: target.waitingReason, boardId: target.boardId },
    TARGET_STATUS[type],
    { waitingReason: type === "hold" ? normalizeHoldReason(input.reason) : undefined, now },
  );
  if (!changed.ok) return fail(changed.error);
  const { patch, update } = changed.value;
  // start, hold, and deliver always change the status and write an update.
  if (!update || !patch.status) throw new Error(`The ${type} change produced no update row`);

  if (type === "start" && !input.confirmed) {
    const headsUp = startHeadsUp({
      inProgressScales: await store.boardLoad(target.boardId),
      guideline: target.guideline,
      scale: target.scale,
    });
    if (headsUp) return fail({ code: "heads_up", ...headsUp });
  }

  const recorded = await store.record({
    ideaId: target.id,
    from: target.status,
    patch,
    update,
    event: {
      kind: "status",
      ideaId: target.id,
      status: patch.status,
      waitingReason: patch.waitingReason,
      changedAt: now,
    },
  });
  if (!recorded) return fail({ code: "already_changed" });

  return { ok: true, status: patch.status, number: target.number };
}

// Start takes the idea and whether the leader has seen the heads-up; hold also takes the
// reason; deliver takes only the idea.
function parseInput(
  type: StatusType,
  raw: unknown,
): { ok: true; ideaId: string; reason: string; confirmed: boolean } | { ok: false; fields: string[] } {
  const schema = type === "start" ? startInputSchema : type === "hold" ? holdInputSchema : deliverInputSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, fields };
  }
  const data: { ideaId: string; reason?: string; confirmed?: boolean } = parsed.data;
  return { ok: true, ideaId: data.ideaId, reason: data.reason ?? "", confirmed: data.confirmed ?? false };
}
