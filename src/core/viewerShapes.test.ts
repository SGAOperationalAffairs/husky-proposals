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

  it("is never returned for a pending, declined, or withdrawn post to someone else", () => {
    for (const reviewStatus of ["pending", "declined", "withdrawn"] as const) {
      expect(ideaForViewer(visitor, idea({ reviewStatus }))).toBeNull();
      expect(ideaForViewer(student, idea({ reviewStatus }))).toBeNull();
    }
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
        reviews: [{ decision: "declined", reason: "Too similar to #88." }],
      }),
    );
    expect(result?.idea).toMatchObject({
      reviewStatus: "declined",
      review: { decision: "declined", reason: "Too similar to #88." },
    });
  });

  it("does not show the author's email to the author", () => {
    const result = ideaForViewer(author, idea());
    expect(everyKeyAndValue(result)).not.toContain("ada@northeastern.edu");
  });
});

describe("leader shape", () => {
  it("is not given to a student, even on an approved idea", () => {
    expect(ideaForViewer(student, idea())?.shape).toBe("student");
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
