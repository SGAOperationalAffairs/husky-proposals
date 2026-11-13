// Status and board rules for an approved idea (#51, "State rules" in
// docs/data-model.md; hold also writes a system update, #98). Pure: no database, no clock (the caller passes `now`, so
// tests can pin it), and no throws. A rule failure is a returned error code.
// Who may call these is #52, and the review state machine is #50.
import { z } from "zod";
import { BOARDS, type BoardCode } from "./boards";
import type { IdeaStatus } from "./statuses";

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type SystemUpdate = { kind: "system"; body: string };

export type StatusError =
  | { code: "invalid_transition"; from: IdeaStatus; to: IdeaStatus }
  | { code: "same_status"; status: IdeaStatus }
  | { code: "waiting_reason_required" };

export type BoardError = { code: "same_board"; boardId: BoardCode };

// Typed as a Record so a new IdeaStatus member fails to compile. delivered is
// final (data-model gap 4). in_progress to waiting is not allowed yet: it is
// proposed for E7 and undecided (gap 3), so adding it is one entry here.
export const TRANSITIONS: Record<IdeaStatus, readonly IdeaStatus[]> = {
  collecting_support: ["waiting", "in_progress"],
  waiting: ["collecting_support", "in_progress"],
  in_progress: ["delivered"],
  delivered: [],
};

const rowFor = (from: IdeaStatus): readonly IdeaStatus[] => TRANSITIONS[from];

// Lets the leader panel show only the buttons that work.
export function nextStatuses(from: IdeaStatus): readonly IdeaStatus[] {
  return rowFor(from);
}

export type StatusPatch = {
  status?: IdeaStatus;
  waitingReason: string | null;
  statusChangedAt?: Date;
  deliveredAt?: Date;
};

// Approval sets collecting_support. The approve action spreads this into the
// same write as the review decision (#50).
export function statusOnApproval(now: Date) {
  return { status: "collecting_support" as const, waitingReason: null, statusChangedAt: now };
}

// The reasons the hold dialog offers (#98). Students read them, so none names a
// confidential talk with administration and none promises action. "Something else"
// is the dialog's free-text path and is not listed here.
export const HOLD_REASONS = [
  "The board is busy with other ideas right now",
  "It needs more information first",
  "It needs administration approval first",
  "It is waiting on university partners",
  "It overlaps with another idea",
] as const;

export const HOLD_REASON_MAX = 200;

// One shape for a reason, preset or typed: the page reads it as "<reason>." so a
// trailing period would double up (#98).
export function normalizeHoldReason(reason: string): string {
  return reason.trim().replace(/\.+$/, "").trim().slice(0, HOLD_REASON_MAX);
}

// Input for the status server actions (#98). Same shape as the review inputs in review.ts.
export const startInputSchema = z.object({ ideaId: z.uuid(), confirmed: z.boolean().default(false) });
export const holdInputSchema = z.object({
  ideaId: z.uuid(),
  reason: z.string().trim().min(1).max(HOLD_REASON_MAX),
});
export const deliverInputSchema = z.object({ ideaId: z.uuid() });

type SystemEvent =
  | { type: "started"; boardId: BoardCode }
  | { type: "delivered"; boardId: BoardCode }
  | { type: "held"; boardId: BoardCode; reason: string }
  | { type: "moved"; from: BoardCode; to: BoardCode };

// One place for the copy, so a wording change is one edit and the seed and the
// leader panel reuse it. It states what happened and promises nothing.
export function systemUpdateBody(event: SystemEvent): string {
  switch (event.type) {
    case "started":
      return `The ${BOARDS[event.boardId].name} started work on this idea.`;
    case "delivered":
      return `The ${BOARDS[event.boardId].name} marked this idea delivered.`;
    case "held":
      return `The ${BOARDS[event.boardId].name} put this idea on hold: ${event.reason}.`;
    case "moved":
      return `Moved from the ${BOARDS[event.from].name} to the ${BOARDS[event.to].name}.`;
  }
}

function systemUpdate(event: SystemEvent): SystemUpdate {
  return { kind: "system", body: systemUpdateBody(event) };
}

export function changeStatus(
  idea: { status: IdeaStatus; waitingReason: string | null; boardId: BoardCode },
  to: IdeaStatus,
  { waitingReason, now }: { waitingReason?: string; now: Date },
): Result<{ patch: StatusPatch; update: SystemUpdate | null }, StatusError> {
  const from = idea.status;
  const reason = waitingReason?.trim() ?? "";

  if (to === from) {
    // A board may correct the reason students see. statusChangedAt stays, so the
    // stale-update clock is not reset by a wording fix.
    if (to === "waiting" && reason !== "" && reason !== idea.waitingReason) {
      return { ok: true, value: { patch: { waitingReason: reason }, update: null } };
    }
    return { ok: false, error: { code: "same_status", status: from } };
  }
  if (!rowFor(from).includes(to)) {
    return { ok: false, error: { code: "invalid_transition", from, to } };
  }
  if (to === "waiting" && reason === "") {
    return { ok: false, error: { code: "waiting_reason_required" } };
  }

  const patch: StatusPatch = {
    status: to,
    // Leaving waiting clears the reason so a stale one never shows.
    waitingReason: to === "waiting" ? reason : null,
    statusChangedAt: now,
  };
  if (to === "delivered") patch.deliveredAt = now;

  let update: SystemUpdate | null = null;
  if (to === "in_progress") update = systemUpdate({ type: "started", boardId: idea.boardId });
  if (to === "delivered") update = systemUpdate({ type: "delivered", boardId: idea.boardId });
  if (to === "waiting") update = systemUpdate({ type: "held", boardId: idea.boardId, reason });

  return { ok: true, value: { patch, update } };
}

// The board is the one field SGA may change on any posted idea, so there is no
// status gate. Who may move it (the VP) is #52.
export function moveBoard(
  idea: { boardId: BoardCode },
  to: BoardCode,
): Result<{ boardId: BoardCode; update: SystemUpdate }, BoardError> {
  if (to === idea.boardId) return { ok: false, error: { code: "same_board", boardId: to } };
  return {
    ok: true,
    value: { boardId: to, update: systemUpdate({ type: "moved", from: idea.boardId, to }) },
  };
}
