import { describe, expect, it } from "vitest";
import type { Viewer } from "./permissions";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "./positions";
import { ideaForViewer, type IdeaRow } from "./viewerShapes";

// Viewer shapes (#53). What a viewer may see of an idea is decided here, in one
// function. Students and visitors get the student shape; the author gets the author
// shape; leaders get the leader shape with more identity. Private fields must not
// reach the student shape, so these tests scan the whole output, not one field.

const AUTHOR_ID = "00000000-0000-7000-8000-00000000a001";
const SUPPORTER_ID = "00000000-0000-7000-8000-00000000b001";

function viewer(id: string, positions: string[]): Viewer {
  return { user: { id }, roles: rolesFromPositions(positions) };
}

const visitor: Viewer = null;
const student = viewer("student", []);
const author = viewer(AUTHOR_ID, []);
const dabChair = viewer("dab-chair", [BOARD_POSITIONS.DAB.lead]);
const cscChair = viewer("csc-chair", [BOARD_POSITIONS.CSC.lead]);
const vp = viewer("vp", [VP_CAMPUS_AFFAIRS]);

function idea(overrides: Partial<IdeaRow> = {}): IdeaRow {
  return {
    id: "00000000-0000-7000-8000-0000000000f1",
    number: 103,
    title: "Compost bins in every dining hall",
    description: "Put compost bins next to every trash can.",
    fullText: "Full text of the idea.",
    category: "dining",
    boardId: "DAB",
    location: "Curry Student Center",
    scale: "medium",
    costBand: "low",
    timeHorizon: "one_term",
    status: "collecting_support",
    waitingReason: null,
    closedReason: null,
    fromSga: false,
    isAnonymous: false,
    reviewStatus: "approved",
    submittedAt: new Date("2026-10-30T12:00:00Z"),
    approvedAt: new Date("2026-10-31T12:00:00Z"),
    statusChangedAt: null,
    deliveredAt: null,
    updatedAt: new Date("2026-10-31T12:00:00Z"),
    authorId: AUTHOR_ID,
    author: { id: AUTHOR_ID, displayName: "Ada Lovelace", email: "ada@northeastern.edu" },
    supports: [{ user: { id: SUPPORTER_ID, displayName: "Sam Supporter", email: "sam@northeastern.edu" } }],
    reviews: [],
    ...overrides,
  };
}

// Every key and string value anywhere in the output, so a leak anywhere is caught.
function everyKeyAndValue(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(everyKeyAndValue);
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...everyKeyAndValue(inner)]);
  }
  return [];
}

const FORBIDDEN_IN_STUDENT_SHAPE = [
  "authorId",
  "author_id",
  "email",
  "supports",
  "supporters",
  "ada@northeastern.edu",
  "sam@northeastern.edu",
  AUTHOR_ID,
  SUPPORTER_ID,
];

describe("student shape", () => {
  it("is returned to a visitor for an approved idea", () => {
    const result = ideaForViewer(visitor, idea());
    expect(result?.shape).toBe("student");
  });

  it("never carries an author id, an email, or a supporter identity", () => {
    const result = ideaForViewer(student, idea());
    const seen = everyKeyAndValue(result);
    for (const forbidden of FORBIDDEN_IN_STUDENT_SHAPE) {
      expect(seen).not.toContain(forbidden);
    }
  });

  it("shows the author's display name on a post that is not anonymous", () => {
    const result = ideaForViewer(student, idea({ isAnonymous: false }));
    expect(result?.idea).toMatchObject({ authorName: "Ada Lovelace" });
  });

  it("shows no author name at all on an anonymous post", () => {
    const result = ideaForViewer(student, idea({ isAnonymous: true }));
    expect(result?.idea.authorName).toBeNull();
    expect(everyKeyAndValue(result)).not.toContain("Ada Lovelace");
  });

  it("is never returned for a pending, declined, withdrawn, or taken-down post to someone else", () => {
    for (const reviewStatus of ["pending", "declined", "withdrawn", "taken_down"] as const) {
      expect(ideaForViewer(visitor, idea({ reviewStatus }))).toBeNull();
      expect(ideaForViewer(student, idea({ reviewStatus }))).toBeNull();
    }
  });
});

// A closed idea (#237). The reason is public, like the hold reason. No column says who
// closed it, so nothing about a closer or a reviewer may appear in the student shape.
describe("student shape of a closed idea (#237)", () => {
  const REASON = "Facilities is not adding new outdoor power this year";
  const closed = (overrides: Partial<IdeaRow> = {}) =>
    idea({ status: "closed", closedReason: REASON, ...overrides });

  it("gives a visitor and a student the status and the reason", () => {
    for (const who of [visitor, student]) {
      for (const isAnonymous of [true, false]) {
        const result = ideaForViewer(who, closed({ isAnonymous }));
        expect(result?.shape).toBe("student");
        expect(result?.idea).toMatchObject({ status: "closed", closedReason: REASON });
      }
    }
  });

  it("carries no identity and no reviewer data anywhere in its keys or values", () => {
    const seen = everyKeyAndValue(
      ideaForViewer(
        student,
        closed({ reviews: [{ decision: "approved", kind: "review", reason: "Fine." }] }),
      ),
    );
    for (const forbidden of [
      ...FORBIDDEN_IN_STUDENT_SHAPE,
      "reviews",
      "review",
      "kind",
      "reviewerId",
      "decision",
      "closedBy",
      "closedById",
    ]) {
      expect(seen).not.toContain(forbidden);
    }
  });

  it("still hides the author of an anonymous closed idea", () => {
    const result = ideaForViewer(student, closed({ isAnonymous: true }));
    expect(result?.idea.authorName).toBeNull();
    expect(everyKeyAndValue(result)).not.toContain("Ada Lovelace");
  });

  it("gives a chair of another board the student shape (D16 option A holds for closed)", () => {
    const result = ideaForViewer(cscChair, closed());
    expect(result?.shape).toBe("student");
    expect(everyKeyAndValue(result)).not.toContain("ada@northeastern.edu");
    expect(everyKeyAndValue(result)).not.toContain("sam@northeastern.edu");
  });
});

describe("author shape", () => {
  it("lets the author see their own pending post, with its review status", () => {
    const result = ideaForViewer(author, idea({ reviewStatus: "pending" }));
    expect(result?.shape).toBe("author");
    expect(result?.idea).toMatchObject({ reviewStatus: "pending", review: null });
  });

  it("gives the author the reviewer's reason when a post is declined", () => {
    const result = ideaForViewer(
      author,
      idea({
        reviewStatus: "declined",
        reviews: [{ decision: "declined", kind: "review", reason: "Too similar to #88." }],
      }),
    );
    expect(result?.idea).toMatchObject({
      reviewStatus: "declined",
      review: { decision: "declined", kind: "review", reason: "Too similar to #88." },
    });
  });

  it("gives the author the kind and reason of a take-down (#286)", () => {
    const result = ideaForViewer(
      author,
      idea({
        reviewStatus: "taken_down",
        status: null,
        reviews: [{ decision: "declined", kind: "take_down", reason: "It names a person." }],
      }),
    );
    expect(result?.shape).toBe("author");
    expect(result?.idea).toMatchObject({
      reviewStatus: "taken_down",
      review: { decision: "declined", kind: "take_down", reason: "It names a person." },
    });
  });

  it("does not show the author's email to the author", () => {
    const result = ideaForViewer(author, idea());
    expect(everyKeyAndValue(result)).not.toContain("ada@northeastern.edu");
  });
});

// An edit to an approved post (#295). The edit's words are only ever on the author shape.
describe("pending edits (#295)", () => {
  const edit = {
    id: "00000000-0000-7000-8000-0000000000e2",
    title: "PENDING TITLE",
    description: "Pending summary.",
    fullText: "Pending details.",
    category: "dining" as const,
    location: null,
    scale: "large" as const,
    costBand: null,
    timeHorizon: null,
    isAnonymous: false,
  };
  const { id: editId, ...editValues } = edit;
  const waiting = () =>
    idea({ editSubmittedAt: new Date("2026-11-01T12:00:00Z"), revisions: [edit] });

  it("gives the author the pending edit's words, while the idea fields stay approved", () => {
    const result = ideaForViewer(author, waiting());
    expect(result?.shape).toBe("author");
    expect(result?.idea).toMatchObject({
      title: "Compost bins in every dining hall",
      edit: { state: "pending", reason: null, values: editValues },
    });
  });

  it("gives the author a declined edit with its reason, until another edit is sent", () => {
    const declined = idea({
      editSubmittedAt: null,
      revisions: [edit],
      reviews: [{ decision: "declined", kind: "edit", reason: "Say who it helps.", revisionId: editId }],
    });
    expect(ideaForViewer(author, declined)?.idea).toMatchObject({
      edit: { state: "declined", reason: "Say who it helps.", values: editValues },
    });
    // A newer revision than the one the review is on: nothing to show.
    const newer = idea({
      ...declined,
      revisions: [{ ...edit, id: "00000000-0000-7000-8000-0000000000e3" }],
    });
    expect(ideaForViewer(author, newer)?.idea).toMatchObject({ edit: null });
  });

  it("shows no edit after an approved edit, or on a post that is not approved", () => {
    const approvedEdit = idea({
      revisions: [edit],
      reviews: [{ decision: "approved", kind: "edit", reason: null, revisionId: editId }],
    });
    expect(ideaForViewer(author, approvedEdit)?.idea).toMatchObject({ edit: null });
    const sentBack = idea({
      reviewStatus: "declined",
      revisions: [edit],
      reviews: [{ decision: "declined", kind: "edit", reason: "No.", revisionId: editId }],
    });
    expect(ideaForViewer(author, sentBack)?.idea).toMatchObject({ edit: null });
  });

  it("never puts an edit, its marker, or its words on the student or leader shapes", () => {
    for (const who of [visitor, student, dabChair, vp]) {
      const result = ideaForViewer(who, waiting());
      expect(result?.shape).not.toBe("author");
      expect(result?.idea).not.toHaveProperty("edit");
      expect(result?.idea).not.toHaveProperty("editSubmittedAt");
      expect(result?.idea).not.toHaveProperty("revisions");
      expect(everyKeyAndValue(result)).not.toContain("PENDING TITLE");
      expect(everyKeyAndValue(result)).not.toContain("Pending details.");
    }
  });
});

describe("leader shape", () => {
  it("is not given to a student, even on an approved idea", () => {
    expect(ideaForViewer(student, idea())?.shape).toBe("student");
  });

  it("gives a taken-down post to its board's chair and the VP, and to no other leader (#286)", () => {
    const takenDown = idea({ reviewStatus: "taken_down", status: null });
    expect(ideaForViewer(dabChair, takenDown)?.shape).toBe("leader");
    expect(ideaForViewer(vp, takenDown)?.shape).toBe("leader");
    expect(ideaForViewer(cscChair, takenDown)).toBeNull();
  });

  it("hides a taken-down post from a board member, who cannot review the board (#286)", () => {
    const dabMember = viewer("dab-member", [BOARD_POSITIONS.DAB.member]);
    expect(ideaForViewer(dabMember, idea({ reviewStatus: "taken_down", status: null }))).toBeNull();
  });

  it("lets the board's chair see a pending post on that board", () => {
    const result = ideaForViewer(dabChair, idea({ reviewStatus: "pending" }));
    expect(result?.shape).toBe("leader");
  });

  it("hides a pending post from a chair of another board", () => {
    expect(ideaForViewer(cscChair, idea({ reviewStatus: "pending" }))).toBeNull();
  });

  it("shows a leader the author's name, email, and supporters on a named post", () => {
    const result = ideaForViewer(dabChair, idea());
    expect(result?.shape).toBe("leader");
    expect(result?.idea).toMatchObject({
      author: { id: AUTHOR_ID, displayName: "Ada Lovelace", email: "ada@northeastern.edu" },
      supporters: [{ id: SUPPORTER_ID, displayName: "Sam Supporter", email: "sam@northeastern.edu" }],
    });
  });

  it("gives a chair of another board the student shape, with no author and no supporters (D16 option A)", () => {
    for (const isAnonymous of [true, false]) {
      const result = ideaForViewer(cscChair, idea({ isAnonymous }));
      expect(result?.shape).toBe("student");
      expect(everyKeyAndValue(result)).not.toContain("ada@northeastern.edu");
      expect(everyKeyAndValue(result)).not.toContain("sam@northeastern.edu");
    }
  });

  it("shows the anonymous author to the board's own chair", () => {
    const result = ideaForViewer(dabChair, idea({ isAnonymous: true }));
    expect(result?.idea).toMatchObject({
      author: { id: AUTHOR_ID, email: "ada@northeastern.edu" },
      authorHidden: false,
    });
  });

  it("shows the anonymous author to the VP", () => {
    const result = ideaForViewer(vp, idea({ isAnonymous: true }));
    expect(result?.idea).toMatchObject({ author: { id: AUTHOR_ID }, authorHidden: false });
  });

  it("shows no supporter list at all when one supporter's identity is incomplete", () => {
    // A partial list would read as the full count, so it is withheld instead.
    const result = ideaForViewer(
      dabChair,
      idea({
        supports: [
          { user: { id: SUPPORTER_ID, displayName: "Sam Supporter", email: "sam@northeastern.edu" } },
          {
            user: {
              id: "00000000-0000-7000-8000-00000000b002",
              displayName: "Partial",
              email: undefined as unknown as string,
            },
          },
        ],
      }),
    );
    expect(result?.idea).toMatchObject({ supporters: null });
  });

  it("fails closed when the row was read without the leader fields", () => {
    // A leader without the identity fields gets no identity, never a guess.
    const result = ideaForViewer(vp, idea({ author: { displayName: "Ada Lovelace" }, supports: undefined }));
    expect(result?.idea).toMatchObject({ author: null, supporters: null });
  });
});
