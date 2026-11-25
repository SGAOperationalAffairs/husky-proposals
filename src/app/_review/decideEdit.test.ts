import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import type { EditFields } from "@/core/postEdit";
import { decideEdit, type EditDecisionWrite, type EditReviewStore, type EditTarget } from "./decideEdit";

// The edit decisions' rules (#295), against a fake store, checking what it received.
const NOW = new Date("2026-11-21T15:00:00.000Z");
const SENT = new Date("2026-11-19T15:00:00.000Z");
const IDEA = "00000000-0000-4000-8000-000000000101";
const EDIT_REVISION = "00000000-0000-4000-8000-000000000302";
const AUTHOR = "00000000-0000-4000-8000-0000000000a1";
const REASON = "Say where the racks would go, and who pays for them";

function sessionFor(id: string, positions: string[]): Session {
  return {
    user: { id, email: `${id}@example.com`, name: `User ${id}` },
    positions: positions.map((key) => ({ key, name: key })),
    roles: rolesFromPositions(positions),
  };
}

const dabChair = sessionFor("00000000-0000-4000-8000-0000000000b1", [BOARD_POSITIONS.DAB.lead]);
const cpabChair = sessionFor("00000000-0000-4000-8000-0000000000b2", [BOARD_POSITIONS.CPAB.lead]);
const student = sessionFor("00000000-0000-4000-8000-0000000000b3", []);
const vp = sessionFor("00000000-0000-4000-8000-0000000000b4", [VP_CAMPUS_AFFAIRS]);
const author = sessionFor(AUTHOR, [BOARD_POSITIONS.DAB.lead]);

const EDIT_FIELDS: EditFields = {
  title: "More bike racks near Snell",
  description: "Add racks near Snell.",
  fullText: "Add racks near Snell Library, where the existing ones are always full.",
  category: "dining",
  location: "Snell Library",
  scale: "medium",
  costBand: null,
  timeHorizon: null,
  isAnonymous: false,
};

function target(overrides: Partial<EditTarget> = {}): EditTarget {
  return {
    id: IDEA,
    boardId: "DAB",
    category: "dining",
    authorId: AUTHOR,
    reviewStatus: "approved",
    number: 131,
    editSubmittedAt: SENT,
    edit: { id: EDIT_REVISION, ...EDIT_FIELDS },
    ...overrides,
  };
}

function fakeStore(found: EditTarget | null, recorded: { reviewId: string } | null = { reviewId: "r-1" }) {
  return {
    find: vi.fn(async () => found),
    record: vi.fn(async (write: EditDecisionWrite) => {
      void write;
      return recorded;
    }),
  } satisfies EditReviewStore;
}

describe("decideEdit (#295)", () => {
  describe("approve", () => {
    it("the board's chair approves: the edit's words, the same board, and one system update", async () => {
      const store = fakeStore(target());
      const result = await decideEdit(store, dabChair, "approve", { ideaId: IDEA }, NOW);
      expect(result).toEqual({ ok: true, decision: "approve", number: 131, refresh: ["ideas", "idea:131"] });
      expect(store.record).toHaveBeenCalledWith({
        ideaId: IDEA,
        editSubmittedAt: SENT,
        patch: { ...EDIT_FIELDS, boardId: "DAB", editSubmittedAt: null },
        review: {
          kind: "edit",
          decision: "approved",
          reason: null,
          revisionId: EDIT_REVISION,
          reviewerId: dabChair.user.id,
          decidedAt: NOW,
        },
        reviewer: { id: dabChair.user.id, email: dabChair.user.email, displayName: dabChair.user.name },
        update: { body: "This post was edited. A reviewer approved the changes." },
      });
    });

    it("never writes the status, number, or approval time: the patch is the edit's words only", async () => {
      const store = fakeStore(target());
      await decideEdit(store, dabChair, "approve", { ideaId: IDEA }, NOW);
      const [write] = store.record.mock.calls[0]!;
      for (const key of ["status", "number", "approvedAt", "statusChangedAt", "reviewStatus"]) {
        expect(write.patch).not.toHaveProperty(key);
      }
    });

    it("a category change moves the board, and only the VP may approve it", async () => {
      const moving = target({ edit: { id: EDIT_REVISION, ...EDIT_FIELDS, category: "campus_services" } });
      const refused = fakeStore(moving);
      expect(await decideEdit(refused, dabChair, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "move_needs_vp" },
      });
      expect(refused.record).not.toHaveBeenCalled();

      const allowed = fakeStore(moving);
      expect((await decideEdit(allowed, vp, "approve", { ideaId: IDEA }, NOW)).ok).toBe(true);
      expect(allowed.record).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({ boardId: "CSC", category: "campus_services" }),
          update: {
            body: "This post was edited and moved to the Campus Services Committee. A reviewer approved the changes.",
          },
        }),
      );
    });

    it("an edit that keeps the category keeps a board the VP moved the idea to", async () => {
      const store = fakeStore(target({ boardId: "CSC", category: "dining" }));
      await decideEdit(store, vp, "approve", { ideaId: IDEA }, NOW);
      expect(store.record).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({ boardId: "CSC" }),
          update: { body: "This post was edited. A reviewer approved the changes." },
        }),
      );
    });
  });

  describe("decline", () => {
    it("clears only the marker, keeps the approved words, writes no update, and refreshes nothing", async () => {
      const store = fakeStore(target());
      const result = await decideEdit(store, dabChair, "decline", { ideaId: IDEA, reason: REASON }, NOW);
      expect(result).toEqual({ ok: true, decision: "decline", number: 131, refresh: [] });
      expect(store.record).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: { editSubmittedAt: null },
          review: expect.objectContaining({
            kind: "edit",
            decision: "declined",
            reason: REASON,
            revisionId: EDIT_REVISION,
          }),
          update: null,
        }),
      );
    });

    it("a chair may decline a board move even though they may not approve it", async () => {
      const moving = target({ edit: { id: EDIT_REVISION, ...EDIT_FIELDS, category: "campus_services" } });
      const store = fakeStore(moving);
      expect((await decideEdit(store, dabChair, "decline", { ideaId: IDEA, reason: REASON }, NOW)).ok).toBe(
        true,
      );
    });

    it("a reason under 40 characters is invalid and nothing is read or written", async () => {
      const store = fakeStore(target());
      const result = await decideEdit(
        store,
        dabChair,
        "decline",
        { ideaId: IDEA, reason: "x".repeat(39) },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: { code: "invalid", fields: ["reason"] } });
      expect(store.find).not.toHaveBeenCalled();
      expect(store.record).not.toHaveBeenCalled();
    });
  });

  describe("refusals", () => {
    it("bad input is invalid", async () => {
      const store = fakeStore(target());
      expect(await decideEdit(store, dabChair, "approve", { ideaId: "nope" }, NOW)).toEqual({
        ok: false,
        error: { code: "invalid", fields: ["ideaId"] },
      });
    });

    it("a missing idea is not_found", async () => {
      expect(await decideEdit(fakeStore(null), dabChair, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "not_found" },
      });
    });

    it.each([
      ["another board's chair", cpabChair],
      ["a student", student],
    ])("%s gets not_allowed, with no write", async (_name, who) => {
      const store = fakeStore(target());
      expect(await decideEdit(store, who, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "not_allowed" },
      });
      expect(store.record).not.toHaveBeenCalled();
    });

    it("nothing waiting is no_pending_edit", async () => {
      const store = fakeStore(target({ editSubmittedAt: null }));
      expect(await decideEdit(store, dabChair, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "no_pending_edit" },
      });
      expect(store.record).not.toHaveBeenCalled();
    });

    it("a marker with no revision behind it fails closed", async () => {
      const store = fakeStore(target({ edit: null }));
      expect(await decideEdit(store, dabChair, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "no_pending_edit" },
      });
      expect(store.record).not.toHaveBeenCalled();
    });

    it.each(["declined", "taken_down", "pending", "withdrawn"] as const)(
      "a %s post is not_approved",
      async (reviewStatus) => {
        const store = fakeStore(target({ reviewStatus }));
        expect(await decideEdit(store, dabChair, "approve", { ideaId: IDEA }, NOW)).toEqual({
          ok: false,
          error: { code: "not_approved", from: reviewStatus },
        });
        expect(store.record).not.toHaveBeenCalled();
      },
    );

    it("nobody decides their own post's edit", async () => {
      const store = fakeStore(target());
      expect(await decideEdit(store, author, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "own_post" },
      });
      expect(store.record).not.toHaveBeenCalled();
    });

    it("a guard miss, because someone decided first, is already_decided", async () => {
      const store = fakeStore(target(), null);
      expect(await decideEdit(store, dabChair, "approve", { ideaId: IDEA }, NOW)).toEqual({
        ok: false,
        error: { code: "already_decided" },
      });
    });
  });
});
