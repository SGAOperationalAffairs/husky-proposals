import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_CODES } from "@/core/boards";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import { changeReviewDueDays, type BoardSettingsStore } from "./changeReviewDueDays";

// The review due setting's rules (#58), against a fake store.
function sessionFor(id: string, positions: string[]): Session {
  return {
    user: { id, email: `${id}@example.com`, name: `User ${id}` },
    positions: positions.map((key) => ({ key, name: key })),
    roles: rolesFromPositions(positions),
  };
}

const vp = sessionFor("vp", [VP_CAMPUS_AFFAIRS]);
const dabChair = sessionFor("dab-chair", [BOARD_POSITIONS.DAB.lead]);
const dabMember = sessionFor("dab-member", [BOARD_POSITIONS.DAB.member]);
const student = sessionFor("student", []);

const fakeStore = () => ({ setReviewDueDays: vi.fn(async () => {}) }) satisfies BoardSettingsStore;

describe("changeReviewDueDays (#58)", () => {
  it("the VP sets 5 days on each of the five boards", async () => {
    for (const boardId of BOARD_CODES) {
      const store = fakeStore();
      const result = await changeReviewDueDays(store, vp, { boardId, days: 5 });
      expect(result, boardId).toEqual({ ok: true, boardId, reviewDueDays: 5 });
      expect(store.setReviewDueDays).toHaveBeenCalledWith(boardId, 5);
    }
  });

  it("a chair sets their own board, and nothing on another", async () => {
    const own = fakeStore();
    expect(await changeReviewDueDays(own, dabChair, { boardId: "DAB", days: 2 })).toEqual({
      ok: true,
      boardId: "DAB",
      reviewDueDays: 2,
    });
    expect(own.setReviewDueDays).toHaveBeenCalledWith("DAB", 2);

    const other = fakeStore();
    expect(await changeReviewDueDays(other, dabChair, { boardId: "CPAB", days: 2 })).toEqual({
      ok: false,
      error: { code: "not_allowed" },
    });
    expect(other.setReviewDueDays).not.toHaveBeenCalled();
  });

  it("a student and a board member get not_allowed", async () => {
    for (const who of [student, dabMember]) {
      const store = fakeStore();
      expect(await changeReviewDueDays(store, who, { boardId: "DAB", days: 3 })).toEqual({
        ok: false,
        error: { code: "not_allowed" },
      });
      expect(store.setReviewDueDays).not.toHaveBeenCalled();
    }
  });

  it("0, 15, and 2.5 days are invalid and nothing is written", async () => {
    for (const days of [0, 15, 2.5]) {
      const store = fakeStore();
      const result = await changeReviewDueDays(store, vp, { boardId: "DAB", days });
      expect(result, String(days)).toEqual({ ok: false, error: { code: "invalid", fields: ["days"] } });
      expect(store.setReviewDueDays).not.toHaveBeenCalled();
    }
  });
});
