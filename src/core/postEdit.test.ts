import { describe, expect, it } from "vitest";
import { BOARD_POSITIONS, rolesFromPositions, VP_CAMPUS_AFFAIRS } from "./positions";
import {
  EDIT_FIELD_LABELS,
  EDIT_FIELDS,
  EDIT_TRANSITIONS,
  applyEditEvent,
  boardAfterEdit,
  editDiff,
  editPostSchema,
  editedUpdateBody,
  hasChanges,
  mayApproveEdit,
  type EditEvent,
  type EditFields,
  type EditPost,
} from "./postEdit";
import type { ReviewStatus } from "./review";

const AUTHOR = "student-1";
const REVIEWER = "chair-1";

const SUBMIT: EditEvent = { type: "submit_edit", actorId: AUTHOR };
const APPROVE: EditEvent = { type: "approve_edit", actorId: REVIEWER };
const DECLINE: EditEvent = {
  type: "decline_edit",
  actorId: REVIEWER,
  reason: "Please say who this helps.",
};

const post = (overrides: Partial<EditPost> = {}): EditPost => ({
  reviewStatus: "approved",
  authorId: AUTHOR,
  editPending: false,
  ...overrides,
});

const fields = (overrides: Partial<EditFields> = {}): EditFields => ({
  title: "Late-night dining",
  description: "Keep one dining location open until midnight.",
  fullText: "Labs and the library close late, and the dining halls close before they do.",
  category: "dining",
  location: "Curry Student Center",
  scale: "medium",
  costBand: null,
  timeHorizon: null,
  isAnonymous: false,
  ...overrides,
});

describe("editing an approved post (#295)", () => {
  describe("transitions", () => {
    it("none allows only submit_edit, which moves to pending", () => {
      expect(EDIT_TRANSITIONS.none).toEqual({ submit_edit: "pending" });
      expect(applyEditEvent(post(), SUBMIT)).toEqual({ ok: true, next: "pending", review: null });
    });

    it("pending allows an approve or a decline, each back to none", () => {
      expect(EDIT_TRANSITIONS.pending).toEqual({ approve_edit: "none", decline_edit: "none" });
      expect(applyEditEvent(post({ editPending: true }), APPROVE)).toEqual({
        ok: true,
        next: "none",
        review: { kind: "edit", decision: "approved", reason: null },
      });
      expect(applyEditEvent(post({ editPending: true }), DECLINE)).toEqual({
        ok: true,
        next: "none",
        review: { kind: "edit", decision: "declined", reason: "Please say who this helps." },
      });
    });

    it("trims the decline reason", () => {
      const result = applyEditEvent(post({ editPending: true }), { ...DECLINE, reason: "  Add detail.  " });
      expect(result).toMatchObject({ ok: true, review: { reason: "Add detail." } });
    });
  });

  describe("errors", () => {
    it.each<ReviewStatus>(["pending", "declined", "withdrawn", "taken_down"])(
      "not_approved for a %s post, whatever the event",
      (reviewStatus) => {
        for (const event of [SUBMIT, APPROVE, DECLINE]) {
          expect(applyEditEvent(post({ reviewStatus, editPending: true }), event)).toEqual({
            ok: false,
            error: { code: "not_approved" },
          });
        }
      },
    );

    it("edit_pending when the author edits again before a decision", () => {
      expect(applyEditEvent(post({ editPending: true }), SUBMIT)).toEqual({
        ok: false,
        error: { code: "edit_pending" },
      });
    });

    it("no_pending_edit when a decision has nothing waiting", () => {
      for (const event of [APPROVE, DECLINE]) {
        expect(applyEditEvent(post(), event)).toEqual({ ok: false, error: { code: "no_pending_edit" } });
      }
    });

    it("not_author when someone else submits the edit", () => {
      expect(applyEditEvent(post(), { type: "submit_edit", actorId: "someone-else" })).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
      expect(applyEditEvent(post({ authorId: null }), SUBMIT)).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
    });

    it("own_post when the author decides their own edit", () => {
      for (const event of [
        { type: "approve_edit", actorId: AUTHOR },
        { type: "decline_edit", actorId: AUTHOR, reason: "No." },
      ] as const) {
        expect(applyEditEvent(post({ editPending: true }), event)).toEqual({
          ok: false,
          error: { code: "own_post" },
        });
      }
    });

    it("reason_required for a blank decline reason", () => {
      expect(applyEditEvent(post({ editPending: true }), { ...DECLINE, reason: "   " })).toEqual({
        ok: false,
        error: { code: "reason_required" },
      });
    });
  });

  describe("hasChanges", () => {
    it("is false for the same fields", () => {
      expect(hasChanges(fields(), fields())).toBe(false);
    });

    it("is false after the schema trims a whitespace-only difference", () => {
      const base = {
        ideaId: "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10",
        title: "Late-night dining",
        summary: "Keep one dining location open until midnight.",
        details: "Labs and the library close late, and the dining halls close before they do. ".padEnd(90, "x"),
        category: "dining",
      };
      const plain = editPostSchema.parse(base);
      const padded = editPostSchema.parse({ ...base, title: "  Late-night dining  ", details: ` ${base.details} ` });
      const stored = (parsed: typeof plain) =>
        fields({ title: parsed.title, description: parsed.summary, fullText: parsed.details });
      expect(hasChanges(stored(plain), stored(padded))).toBe(false);
    });

    it("is true when any field changes, including anonymity", () => {
      expect(hasChanges(fields(), fields({ isAnonymous: true }))).toBe(true);
      expect(hasChanges(fields(), fields({ title: "Later dining" }))).toBe(true);
      expect(hasChanges(fields(), fields({ scale: null }))).toBe(true);
    });
  });

  describe("boardAfterEdit", () => {
    it("keeps a board the VP moved when the category is the same", () => {
      expect(boardAfterEdit({ category: "dining", boardId: "CSC" }, "dining")).toBe("CSC");
    });

    it("maps a new category to its board", () => {
      expect(boardAfterEdit({ category: "dining", boardId: "DAB" }, "campus_services")).toBe("CSC");
    });
  });

  describe("mayApproveEdit", () => {
    const viewer = (...keys: string[]) => ({ user: { id: REVIEWER }, roles: rolesFromPositions(keys) });
    const dabChair = viewer(BOARD_POSITIONS.DAB.lead);
    const vp = viewer(VP_CAMPUS_AFFAIRS);

    it("a chair may approve an edit that keeps the board", () => {
      expect(mayApproveEdit(dabChair, "DAB", "DAB")).toBe(true);
    });

    it("a chair may not approve an edit that moves the board", () => {
      expect(mayApproveEdit(dabChair, "DAB", "CSC")).toBe(false);
    });

    it("the VP may approve a move", () => {
      expect(mayApproveEdit(vp, "DAB", "CSC")).toBe(true);
    });

    it("a chair of another board, a student, and a visitor may not approve", () => {
      expect(mayApproveEdit(viewer(BOARD_POSITIONS.CSC.lead), "DAB", "DAB")).toBe(false);
      expect(mayApproveEdit(viewer(), "DAB", "DAB")).toBe(false);
      expect(mayApproveEdit(null, "DAB", "DAB")).toBe(false);
    });
  });

  describe("editDiff", () => {
    it("lists only changed fields, in form order, with their words", () => {
      const diff = editDiff(
        fields(),
        fields({ title: "Later dining", category: "campus_services", scale: "large", isAnonymous: true }),
      );
      expect(diff).toEqual([
        { field: "title", before: "Late-night dining", after: "Later dining" },
        { field: "category", before: "Dining Advisory Board", after: "Campus Services Committee" },
        { field: "scale", before: "Medium", after: "Large" },
        { field: "isAnonymous", before: "No", after: "Yes" },
      ]);
    });

    it("shows a cleared field as Not sure", () => {
      expect(editDiff(fields(), fields({ scale: null, location: null }))).toEqual([
        { field: "location", before: "Curry Student Center", after: "Not sure" },
        { field: "scale", before: "Medium", after: "Not sure" },
      ]);
    });

    it("has a label for every field", () => {
      expect(Object.keys(EDIT_FIELD_LABELS).sort()).toEqual([...EDIT_FIELDS].sort());
    });
  });

  describe("editedUpdateBody", () => {
    it("says the post was edited and approved", () => {
      expect(editedUpdateBody(null)).toBe("This post was edited. A reviewer approved the changes.");
    });

    it("names the board when the post moved", () => {
      expect(editedUpdateBody("CSC")).toBe(
        "This post was edited and moved to the Campus Services Committee. A reviewer approved the changes.",
      );
    });

    it("uses no em dash and promises nothing", () => {
      for (const body of [editedUpdateBody(null), editedUpdateBody("DAB")]) {
        expect(body).not.toContain("—");
        expect(body.toLowerCase()).not.toMatch(/will|petition/);
      }
    });
  });
});
