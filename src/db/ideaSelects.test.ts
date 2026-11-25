import { describe, expect, it } from "vitest";
import {
  authorIdeaSelect,
  awaitingEditReview,
  awaitingReview,
  editQueueSelect,
  isPublic,
  leaderIdeaSelect,
  namedPost,
  onWall,
  publicAuthorSelect,
  publicStatsSelect,
  publicUpdateSelect,
  reviewQueueSelect,
  studentIdeaSelect,
} from "./ideaSelects";

// The field lists behind the viewer shapes (#53). Each one is checked with
// `satisfies Prisma.IdeaSelect` in ideaSelects.ts, so a wrong field name fails to
// compile. These tests pin what each list may read, so a private field cannot
// creep into the student list.

describe("studentIdeaSelect", () => {
  it("never reads the author, a supporter, or a review (#257)", () => {
    expect(studentIdeaSelect).not.toHaveProperty("author");
    expect(studentIdeaSelect).not.toHaveProperty("authorId");
    expect(studentIdeaSelect).not.toHaveProperty("supports");
    expect(studentIdeaSelect).not.toHaveProperty("reviews");
  });

  // A pending edit is never public (#295): the student list reads neither the marker nor
  // the revisions the edit lives in.
  it("never reads a pending edit (#295)", () => {
    expect(studentIdeaSelect).not.toHaveProperty("editSubmittedAt");
    expect(studentIdeaSelect).not.toHaveProperty("revisions");
    expect(leaderIdeaSelect).not.toHaveProperty("editSubmittedAt");
    expect(leaderIdeaSelect).not.toHaveProperty("revisions");
  });

  // Pinned (#237): a new field, such as who closed an idea, fails here until someone
  // decides it is public.
  it("reads exactly these fields", () => {
    expect(Object.keys(studentIdeaSelect).sort()).toEqual(
      [
        "approvedAt",
        "boardId",
        "category",
        "closedReason",
        "costBand",
        "deliveredAt",
        "description",
        "fromSga",
        "fullText",
        "id",
        "isAnonymous",
        "location",
        "number",
        "reviewStatus",
        "scale",
        "status",
        "statusChangedAt",
        "submittedAt",
        "timeHorizon",
        "title",
        "updatedAt",
        "waitingReason",
      ].sort(),
    );
  });
});

describe("author and leader selects", () => {
  it("the author select adds the viewer's own display name and only the latest review", () => {
    expect(authorIdeaSelect).toMatchObject({
      author: { select: { displayName: true } },
      reviews: { select: { decision: true, kind: true, reason: true, revisionId: true }, take: 1 },
    });
    expect(authorIdeaSelect).not.toHaveProperty("supports");
  });

  it("the author select adds the edit marker and the latest revision (#295)", () => {
    expect(authorIdeaSelect).toMatchObject({
      editSubmittedAt: true,
      revisions: { orderBy: { version: "desc" }, take: 1 },
    });
  });

  it("the leader select adds the author's identity and the supporters", () => {
    expect(leaderIdeaSelect).toMatchObject({
      authorId: true,
      author: { select: { id: true, displayName: true, email: true } },
      supports: { select: { user: { select: { id: true, displayName: true, email: true } } } },
    });
  });

  it("every leader and author select still includes the student fields", () => {
    for (const key of Object.keys(studentIdeaSelect)) {
      expect(leaderIdeaSelect).toHaveProperty(key);
      expect(authorIdeaSelect).toHaveProperty(key);
    }
  });
});

describe("review queue select and filter (#58)", () => {
  it("reads no supporters, a pending post has none, and reads the board's due days", () => {
    expect(reviewQueueSelect).not.toHaveProperty("supports");
    expect(reviewQueueSelect).toMatchObject({
      authorId: true,
      author: leaderIdeaSelect.author,
      board: { select: { reviewDueDays: true } },
    });
  });

  it("still includes the student fields", () => {
    for (const key of Object.keys(studentIdeaSelect)) expect(reviewQueueSelect).toHaveProperty(key);
  });

  it("awaitingReview is pending posts on the given boards", () => {
    expect(awaitingReview(["DAB", "SC"])).toEqual({
      reviewStatus: "pending",
      boardId: { in: ["DAB", "SC"] },
    });
  });
});

describe("edit queue select and filter (#295)", () => {
  it("adds the sent time and the latest revision to the queue select, and still reads no supporters", () => {
    expect(editQueueSelect).toMatchObject({
      editSubmittedAt: true,
      revisions: { orderBy: { version: "desc" }, take: 1 },
      board: { select: { reviewDueDays: true } },
    });
    expect(editQueueSelect).not.toHaveProperty("supports");
  });

  it("awaitingEditReview is approved posts with an edit waiting on the given boards", () => {
    expect(awaitingEditReview(["DAB"])).toEqual({
      reviewStatus: "approved",
      boardId: { in: ["DAB"] },
      editSubmittedAt: { not: null },
    });
  });
});

describe("public stats and update selects (#60)", () => {
  it("read only counts, rank, and times from the stats view", () => {
    expect(Object.keys(publicStatsSelect).sort()).toEqual(
      ["lastUpdateAt", "rankInBoard", "supportCount", "willingCount"].sort(),
    );
  });

  it("read only the kind, text, and time of an update, never who wrote it", () => {
    expect(Object.keys(publicUpdateSelect).sort()).toEqual(["body", "createdAt", "kind"]);
  });

  it("name no identity field", () => {
    const names = [...Object.keys(publicStatsSelect), ...Object.keys(publicUpdateSelect)];
    for (const identity of ["authorId", "author", "followerCount", "userId", "email", "supports"]) {
      expect(names).not.toContain(identity);
    }
  });
});

describe("public author names (#257)", () => {
  it("a name is read only for a non-anonymous post, and only the display name", () => {
    expect(namedPost).toEqual({ isAnonymous: false });
    expect(publicAuthorSelect).toEqual({ id: true, author: { select: { displayName: true } } });
  });
});

describe("isPublic", () => {
  it("is approved posts only, so pending, declined, withdrawn, and taken down never match", () => {
    expect(isPublic).toEqual({ reviewStatus: "approved" });
  });
});

describe("onWall (#237)", () => {
  it("is public ideas that are not closed", () => {
    expect(onWall).toEqual({ reviewStatus: "approved", NOT: { status: "closed" } });
  });

  it("never matches a taken-down idea, since it keeps the approved-only filter (#286)", () => {
    expect(onWall.reviewStatus).toBe("approved");
  });
});
