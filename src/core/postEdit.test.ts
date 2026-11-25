import { describe, expect, it } from "vitest";
import type { Viewer } from "./permissions";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "./positions";
import {
  EDIT_FIELD_LABELS,
  EDIT_TRANSITIONS,
  applyEditEvent,
  boardAfterEdit,
  editDiff,
  editPostSchema,
  editedUpdateBody,
  hasChanges,
  mayApproveEdit,
  unchangedLabels,
  type EditEvent,
  type EditFields,
  type EditPost,
} from "./postEdit";
import { REVIEW_STATUSES, type ReviewStatus } from "./review";

const AUTHOR = "student-1";
const REVIEWER = "chair-1";

const SUBMIT: EditEvent = { type: "submit_edit", actorId: AUTHOR };
const APPROVE: EditEvent = { type: "approve_edit", actorId: REVIEWER };
const DECLINE: EditEvent = { type: "decline_edit", actorId: REVIEWER, reason: "Say where it would go" };

const post = (editPending: boolean, reviewStatus: ReviewStatus = "approved", authorId = AUTHOR): EditPost => ({
  reviewStatus,
  authorId,
  editPending,
});

const FIELDS: EditFields = {
  title: "More bike racks",
  description: "Add racks near Snell.",
  fullText:
    "Add racks near Snell Library, where the existing ones are always full. Students lock bikes to railings and trees, which blocks the paths.",
  category: "campus_planning",
  location: "Snell Library",
  scale: "small",
  costBand: null,
  timeHorizon: null,
  isAnonymous: false,
};

function viewer(id: string, positions: string[]): Viewer {
  return { user: { id }, roles: rolesFromPositions(positions) };
}

describe("editing an approved post (#295)", () => {
  describe("EDIT_TRANSITIONS", () => {
    it("none allows only submit_edit, to pending", () => {
      expect(EDIT_TRANSITIONS.none).toEqual({ submit_edit: "pending" });
    });
    it("pending allows approve_edit and decline_edit, each back to none", () => {
      expect(EDIT_TRANSITIONS.pending).toEqual({ approve_edit: "none", decline_edit: "none" });
    });
  });

  describe("applyEditEvent", () => {
    it("the author submits an edit: pending, no review row yet", () => {
      expect(applyEditEvent(post(false), SUBMIT)).toEqual({ ok: true, next: "pending", review: null });
    });
    it("a reviewer approves a pending edit: an approved edit review", () => {
      expect(applyEditEvent(post(true), APPROVE)).toEqual({
        ok: true,
        next: "none",
        review: { kind: "edit", decision: "approved", reason: null },
      });
    });
    it("a reviewer declines a pending edit with a trimmed reason", () => {
      const result = applyEditEvent(post(true), { ...DECLINE, reason: "  Say where it would go  " });
      expect(result).toEqual({
        ok: true,
        next: "none",
        review: { kind: "edit", decision: "declined", reason: "Say where it would go" },
      });
    });

    it.each(REVIEW_STATUSES.filter((status) => status !== "approved"))(
      "any event on a %s post is not_approved",
      (status) => {
        for (const event of [SUBMIT, APPROVE, DECLINE]) {
          expect(applyEditEvent(post(false, status), event)).toEqual({
            ok: false,
            error: { code: "not_approved", from: status },
          });
        }
      },
    );

    it("submit_edit while an edit waits is edit_pending", () => {
      expect(applyEditEvent(post(true), SUBMIT)).toEqual({ ok: false, error: { code: "edit_pending" } });
    });
    it("a decision with nothing waiting is no_pending_edit", () => {
      for (const event of [APPROVE, DECLINE]) {
        expect(applyEditEvent(post(false), event)).toEqual({
          ok: false,
          error: { code: "no_pending_edit" },
        });
      }
    });
    it("only the author submits: not_author", () => {
      expect(applyEditEvent(post(false), { type: "submit_edit", actorId: "other" })).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
    });
    it("a null author never matches: not_author", () => {
      expect(applyEditEvent({ ...post(false), authorId: null }, SUBMIT)).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
    });
    it("nobody decides their own post's edit: own_post", () => {
      for (const event of [
        { type: "approve_edit", actorId: AUTHOR },
        { type: "decline_edit", actorId: AUTHOR, reason: "x" },
      ] satisfies EditEvent[]) {
        expect(applyEditEvent(post(true), event)).toEqual({ ok: false, error: { code: "own_post" } });
      }
    });
    it("a blank decline reason is reason_required", () => {
      expect(applyEditEvent(post(true), { ...DECLINE, reason: "   " })).toEqual({
        ok: false,
        error: { code: "reason_required" },
      });
    });
  });

  describe("editPostSchema", () => {
    const valid = {
      ideaId: "0198f0a0-0000-7000-8000-000000000001",
      title: "More bike racks",
      summary: "Add racks near Snell.",
      details: "x".repeat(80),
      category: "campus_planning",
    };
    it("is the post form's validation plus the idea id", () => {
      expect(editPostSchema.safeParse(valid).success).toBe(true);
      expect(editPostSchema.safeParse({ ...valid, details: "short" }).success).toBe(false);
      expect(editPostSchema.safeParse({ ...valid, ideaId: "not-an-id" }).success).toBe(false);
    });
  });

  describe("hasChanges", () => {
    it("is false for identical fields", () => {
      expect(hasChanges(FIELDS, { ...FIELDS })).toBe(false);
    });
    it("is false after the schema trims a whitespace-only change", () => {
      const parsed = editPostSchema.parse({
        ideaId: "0198f0a0-0000-7000-8000-000000000001",
        title: `  ${FIELDS.title}  `,
        summary: FIELDS.description,
        details: FIELDS.fullText,
        category: FIELDS.category,
        location: FIELDS.location,
        scale: FIELDS.scale,
        anonymous: false,
      });
      const edit: EditFields = {
        title: parsed.title,
        description: parsed.summary,
        fullText: parsed.details,
        category: parsed.category,
        location: parsed.location,
        scale: parsed.scale,
        costBand: parsed.costBand,
        timeHorizon: parsed.timeHorizon,
        isAnonymous: parsed.anonymous,
      };
      expect(hasChanges(FIELDS, edit)).toBe(false);
    });
    it("is true for an anonymity flip", () => {
      expect(hasChanges(FIELDS, { ...FIELDS, isAnonymous: true })).toBe(true);
    });
    it("is true for a changed scale", () => {
      expect(hasChanges(FIELDS, { ...FIELDS, scale: "large" })).toBe(true);
    });
  });

  describe("boardAfterEdit", () => {
    it("keeps a moved board when the category stays", () => {
      expect(boardAfterEdit({ category: "dining", boardId: "CSC" }, "dining")).toBe("CSC");
    });
    it("maps a new category to its board", () => {
      expect(boardAfterEdit({ category: "dining", boardId: "DAB" }, "campus_services")).toBe("CSC");
    });
  });

  describe("mayApproveEdit", () => {
    const dabChair = viewer("dab", [BOARD_POSITIONS.DAB.lead]);
    const cpabChair = viewer("cpab", [BOARD_POSITIONS.CPAB.lead]);
    const vp = viewer("vp", [VP_CAMPUS_AFFAIRS]);
    it("a chair may approve an edit that keeps the board", () => {
      expect(mayApproveEdit(dabChair, "DAB", "DAB")).toBe(true);
    });
    it("a chair may not approve a board move", () => {
      expect(mayApproveEdit(dabChair, "DAB", "CSC")).toBe(false);
    });
    it("the VP may approve a board move", () => {
      expect(mayApproveEdit(vp, "DAB", "CSC")).toBe(true);
    });
    it("a chair of another board may approve nothing", () => {
      expect(mayApproveEdit(cpabChair, "DAB", "DAB")).toBe(false);
    });
    it("a student and a visitor may approve nothing", () => {
      expect(mayApproveEdit(viewer("s", []), "DAB", "DAB")).toBe(false);
      expect(mayApproveEdit(null, "DAB", "DAB")).toBe(false);
    });
  });

  describe("editDiff", () => {
    it("lists changed fields in order, with labels and words", () => {
      const edit: EditFields = {
        ...FIELDS,
        title: "Bike racks at Snell",
        category: "campus_services",
        scale: "large",
        costBand: "under_1k",
        isAnonymous: true,
      };
      expect(editDiff(FIELDS, edit)).toEqual([
        { field: "title", label: "Title", before: "More bike racks", after: "Bike racks at Snell" },
        {
          field: "category",
          label: "Board",
          before: "Campus Planning Advisory Board",
          after: "Campus Services Committee",
        },
        { field: "scale", label: "Scale", before: "Small", after: "Large" },
        { field: "costBand", label: "Rough cost", before: "Not sure", after: "Under $1k" },
        { field: "isAnonymous", label: "Anonymous to students", before: "No", after: "Yes" },
      ]);
    });
    it("is empty when nothing changed, and unchangedLabels names every field", () => {
      expect(editDiff(FIELDS, { ...FIELDS })).toEqual([]);
      expect(unchangedLabels(FIELDS, { ...FIELDS })).toEqual(Object.values(EDIT_FIELD_LABELS));
    });
    it("unchangedLabels leaves out the changed ones", () => {
      const labels = unchangedLabels(FIELDS, { ...FIELDS, timeHorizon: "this_semester" });
      expect(labels).not.toContain("Timing");
      expect(labels).toContain("Rough cost");
    });
  });

  describe("editedUpdateBody", () => {
    it("says the post was edited and approved", () => {
      expect(editedUpdateBody(null)).toBe("This post was edited. A reviewer approved the changes.");
    });
    it("names the new board on a move", () => {
      expect(editedUpdateBody("CSC")).toBe(
        "This post was edited and moved to the Campus Services Committee. A reviewer approved the changes.",
      );
    });
    it("has no em dash", () => {
      expect(editedUpdateBody(null) + editedUpdateBody("GIB")).not.toContain("—");
    });
  });
});
