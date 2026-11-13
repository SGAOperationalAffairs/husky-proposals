import { describe, expect, it } from "vitest";
import { IDEA_STATUSES, type IdeaStatus } from "./statuses";
import {
  HOLD_REASONS,
  HOLD_REASON_MAX,
  TRANSITIONS,
  changeStatus,
  deliverInputSchema,
  holdInputSchema,
  moveBoard,
  nextStatuses,
  normalizeHoldReason,
  startInputSchema,
  statusOnApproval,
  systemUpdateBody,
} from "./ideaStatus";

const now = new Date("2026-11-30T12:00:00Z");

function idea(status: IdeaStatus, waitingReason: string | null = null) {
  return { status, waitingReason, boardId: "DAB" as const };
}

describe("idea status rules (#51)", () => {
  describe("transition table", () => {
    it("covers the live statuses, and no retired one", () => {
      expect(Object.keys(TRANSITIONS).sort()).toEqual([...IDEA_STATUSES].sort());
      for (const targets of Object.values(TRANSITIONS)) {
        for (const target of targets) expect(IDEA_STATUSES).toContain(target);
      }
    });

    it("nextStatuses returns the table row", () => {
      expect(nextStatuses("in_progress")).toEqual(["delivered"]);
      expect(nextStatuses("delivered")).toEqual([]);
    });

    for (const from of IDEA_STATUSES) {
      for (const to of IDEA_STATUSES) {
        const allowed = TRANSITIONS[from].includes(to);
        it(`${from} to ${to} is ${allowed ? "allowed" : "rejected"}`, () => {
          const result = changeStatus(idea(from, from === "waiting" ? "Needs a budget answer" : null), to, {
            waitingReason: "Needs a budget answer",
            now,
          });
          if (allowed) {
            expect(result.ok).toBe(true);
          } else if (from === to) {
            expect(result).toEqual({ ok: false, error: { code: "same_status", status: from } });
          } else {
            expect(result).toEqual({ ok: false, error: { code: "invalid_transition", from, to } });
          }
        });
      }
    }
  });

  describe("changeStatus", () => {
    it("rejects every move out of delivered", () => {
      for (const to of IDEA_STATUSES) {
        const result = changeStatus(idea("delivered"), to, { waitingReason: "x", now });
        expect(result.ok, to).toBe(false);
      }
    });

    it("requires a reason for waiting: missing, empty, and whitespace-only", () => {
      for (const waitingReason of [undefined, "", "   "]) {
        expect(changeStatus(idea("collecting_support"), "waiting", { waitingReason, now })).toEqual({
          ok: false,
          error: { code: "waiting_reason_required" },
        });
      }
    });

    it("stores a padded reason trimmed", () => {
      const result = changeStatus(idea("collecting_support"), "waiting", {
        waitingReason: "  Needs funding  ",
        now,
      });
      expect(result).toMatchObject({
        ok: true,
        value: { patch: { status: "waiting", waitingReason: "Needs funding" } },
      });
    });

    it("clears the reason when leaving waiting", () => {
      const result = changeStatus(idea("waiting", "Needs funding"), "collecting_support", { now });
      expect(result).toMatchObject({
        ok: true,
        value: { patch: { status: "collecting_support", waitingReason: null } },
      });
    });

    it("sets statusChangedAt to now, and deliveredAt only on delivery", () => {
      const started = changeStatus(idea("collecting_support"), "in_progress", { now });
      expect(started).toMatchObject({ ok: true, value: { patch: { statusChangedAt: now } } });
      expect(started.ok && "deliveredAt" in started.value.patch).toBe(false);

      const delivered = changeStatus(idea("in_progress"), "delivered", { now });
      expect(delivered).toMatchObject({
        ok: true,
        value: { patch: { statusChangedAt: now, deliveredAt: now } },
      });
    });

    it("changes only the reason on waiting to waiting with a new reason", () => {
      const result = changeStatus(idea("waiting", "Old"), "waiting", { waitingReason: " New ", now });
      expect(result).toEqual({ ok: true, value: { patch: { waitingReason: "New" }, update: null } });
    });

    it("rejects waiting to waiting with the same reason", () => {
      const result = changeStatus(idea("waiting", "Old"), "waiting", { waitingReason: "Old", now });
      expect(result).toEqual({ ok: false, error: { code: "same_status", status: "waiting" } });
    });

    it("returns a system update naming the board for start, deliver, and hold (#98)", () => {
      const start = changeStatus(idea("collecting_support"), "in_progress", { now });
      expect(start).toMatchObject({
        ok: true,
        value: { update: { kind: "system", body: "The Dining Advisory Board started work on this idea." } },
      });
      const done = changeStatus(idea("in_progress"), "delivered", { now });
      expect(done).toMatchObject({
        ok: true,
        value: { update: { kind: "system", body: "The Dining Advisory Board marked this idea delivered." } },
      });
      const held = changeStatus(idea("collecting_support"), "waiting", {
        waitingReason: "Needs a budget answer",
        now,
      });
      expect(held).toMatchObject({
        ok: true,
        value: {
          update: {
            kind: "system",
            body: "The Dining Advisory Board put this idea on hold: Needs a budget answer.",
          },
        },
      });
    });

    it("writes no update for leaving waiting or for fixing the reason", () => {
      const back = changeStatus(idea("waiting", "Old"), "collecting_support", { now });
      expect(back).toMatchObject({ ok: true, value: { update: null } });
    });
  });

  describe("moveBoard", () => {
    it("rejects the same board", () => {
      expect(moveBoard({ boardId: "DAB" }, "DAB")).toEqual({
        ok: false,
        error: { code: "same_board", boardId: "DAB" },
      });
    });

    it("returns the new board and a system update", () => {
      expect(moveBoard({ boardId: "DAB" }, "CSC")).toEqual({
        ok: true,
        value: {
          boardId: "CSC",
          update: {
            kind: "system",
            body: "Moved from the Dining Advisory Board to the Campus Services Committee.",
          },
        },
      });
    });
  });

  describe("statusOnApproval", () => {
    it("starts at collecting_support with no reason", () => {
      expect(statusOnApproval(now)).toEqual({
        status: "collecting_support",
        waitingReason: null,
        statusChangedAt: now,
      });
    });
  });

  describe("update copy", () => {
    it("promises nothing", () => {
      const bodies = [
        systemUpdateBody({ type: "started", boardId: "GIB" }),
        systemUpdateBody({ type: "delivered", boardId: "SC" }),
        systemUpdateBody({ type: "moved", from: "CPAB", to: "CSC" }),
        systemUpdateBody({ type: "held", boardId: "CSC", reason: HOLD_REASONS[0] }),
      ];
      for (const body of bodies) expect(body).not.toMatch(/petition|slot|\bwill\b/i);
    });
  });

  describe("hold reasons (#98)", () => {
    it("every preset reads as a plain reason with no trailing period and no promise", () => {
      expect(HOLD_REASONS.length).toBeGreaterThan(0);
      for (const reason of HOLD_REASONS) {
        expect(reason).toBe(normalizeHoldReason(reason));
        expect(reason).not.toMatch(/petition|slot|\bwill\b|—/i);
      }
    });

    it("normalizeHoldReason trims, strips trailing periods, and caps at 200 characters", () => {
      expect(normalizeHoldReason("  Needs funding. ")).toBe("Needs funding");
      expect(normalizeHoldReason("Needs funding...")).toBe("Needs funding");
      expect(normalizeHoldReason("...")).toBe("");
      expect(normalizeHoldReason("a".repeat(250))).toHaveLength(HOLD_REASON_MAX);
    });
  });

  describe("input schemas (#98)", () => {
    const id = "00000000-0000-4000-8000-000000000101";

    it("start takes an idea and defaults confirmed to false", () => {
      expect(startInputSchema.parse({ ideaId: id })).toEqual({ ideaId: id, confirmed: false });
      expect(startInputSchema.parse({ ideaId: id, confirmed: true })).toEqual({
        ideaId: id,
        confirmed: true,
      });
      expect(startInputSchema.safeParse({ ideaId: "nope" }).success).toBe(false);
    });

    it("hold needs a reason of 1 to 200 characters after trimming", () => {
      expect(holdInputSchema.parse({ ideaId: id, reason: "  Needs more information  " }).reason).toBe(
        "Needs more information",
      );
      expect(holdInputSchema.safeParse({ ideaId: id, reason: "   " }).success).toBe(false);
      expect(holdInputSchema.safeParse({ ideaId: id, reason: "a".repeat(201) }).success).toBe(false);
    });

    it("deliver takes only an idea", () => {
      expect(deliverInputSchema.parse({ ideaId: id })).toEqual({ ideaId: id });
      expect(deliverInputSchema.safeParse({}).success).toBe(false);
    });
  });
});
