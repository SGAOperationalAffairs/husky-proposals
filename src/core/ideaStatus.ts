// Status and board rules for an approved idea (#51, "State rules" in
// docs/data-model.md). Pure: no database, no clock (the caller passes `now`, so
// tests can pin it), and no throws. A rule failure is a returned error code.
// Who may call these is #52, and the review state machine is #50.
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
  collecting_support: ["under_review", "waiting", "in_progress"],
  under_review: ["collecting_support", "waiting", "in_progress"],
  waiting: ["collecting_support", "under_review", "in_progress"],
  in_progress: ["delivered"],
  delivered: [],
};

// Lets the leader panel show only the buttons that work.
export function nextStatuses(from: IdeaStatus): readonly IdeaStatus[] {
  return TRANSITIONS[from];
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

type SystemEvent =
  | { type: "started"; boardId: BoardCode }
  | { type: "delivered"; boardId: BoardCode }
  | { type: "moved"; from: BoardCode; to: BoardCode };

// One place for the copy, so a wording change is one edit and the seed and the
// leader panel reuse it. It states what happened and promises nothing.
export function systemUpdateBody(event: SystemEvent): string {
  switch (event.type) {
    case "started":
      return `The ${BOARDS[event.boardId].name} started work on this idea.`;
    case "delivered":
      return `The ${BOARDS[event.boardId].name} marked this idea delivered.`;
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
  if (!TRANSITIONS[from].includes(to)) {
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
