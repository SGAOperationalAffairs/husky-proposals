import type { Session } from "@/auth/contract";
import { startHeadsUp } from "@/core/boardLoad";
import { BOARD_CODES, type BoardCode } from "@/core/boards";
import {
  changeStatus,
  closeInputSchema,
  deliverInputSchema,
  holdInputSchema,
  normalizeClosedReason,
  normalizeHoldReason,
  reopenInputSchema,
  reopenTarget,
  startInputSchema,
  type StatusError,
  type StatusPatch,
  type SystemUpdate,
} from "@/core/ideaStatus";
import { can } from "@/core/permissions";
import type { ReviewStatus } from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";
import type { IdeaEvent } from "@/email/ideaEvent";

// Start, hold, deliver, close, and reopen an approved idea (#98, #126): the rules, with the storage behind
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

export type StatusType = "start" | "hold" | "deliver" | "close" | "reopen";

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

// Reopen has no fixed target: it depends on where the idea is now (reopenTarget).
const TARGET_STATUS: Record<Exclude<StatusType, "reopen">, IdeaStatus> = {
  start: "in_progress",
  hold: "waiting",
  deliver: "delivered",
  close: "closed",
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

  // The table lets a delivered idea go back to in progress, but that is Reopen's move,
  // with its own update copy. Start does not take it.
  if (type === "start" && target.status === "delivered") {
    return fail({ code: "invalid_transition", from: "delivered", to: "in_progress" });
  }

  // A reopen of something that is not delivered or closed has nowhere to go.
  const to = type === "reopen" ? reopenTarget(target.status) : TARGET_STATUS[type];
  if (to === null) return fail({ code: "invalid_transition", from: target.status, to: target.status });

  const changed = changeStatus(
    { status: target.status, waitingReason: target.waitingReason, boardId: target.boardId },
    to,
    {
      waitingReason: type === "hold" ? normalizeHoldReason(input.reason) : undefined,
      closedReason: type === "close" ? normalizeClosedReason(input.reason) : undefined,
      now,
    },
  );
  if (!changed.ok) return fail(changed.error);
  const { patch, update } = changed.value;
  // Every type here changes the status and writes an update.
  if (!update || !patch.status) throw new Error(`The ${type} change produced no update row`);

  // Starting, or reopening into in progress, adds to the board's load (#126).
  if (patch.status === "in_progress" && !input.confirmed) {
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
      // Followers' email carries the reason a closed idea shows students (#237).
      ...(patch.closedReason ? { closedReason: patch.closedReason } : {}),
      changedAt: now,
    },
  });
  if (!recorded) return fail({ code: "already_changed" });

  return { ok: true, status: patch.status, number: target.number };
}

const SCHEMAS = {
  start: startInputSchema,
  reopen: reopenInputSchema,
  hold: holdInputSchema,
  close: closeInputSchema,
  deliver: deliverInputSchema,
} as const;

// Start and reopen take the idea and whether the leader has seen the heads-up; hold and
// close also take the reason; deliver takes only the idea.
function parseInput(
  type: StatusType,
  raw: unknown,
): { ok: true; ideaId: string; reason: string; confirmed: boolean } | { ok: false; fields: string[] } {
  const schema = SCHEMAS[type];
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, fields };
  }
  const data: { ideaId: string; reason?: string; confirmed?: boolean } = parsed.data;
  return { ok: true, ideaId: data.ideaId, reason: data.reason ?? "", confirmed: data.confirmed ?? false };
}
