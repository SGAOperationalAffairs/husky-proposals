import { describe, expect, it } from "vitest";
import {
  authorIdeaSelect,
  awaitingReview,
  isPublic,
  leaderIdeaSelect,
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
  it("never reads the author id, a supporter, or a review", () => {
    expect(studentIdeaSelect).not.toHaveProperty("authorId");
    expect(studentIdeaSelect).not.toHaveProperty("supports");
    expect(studentIdeaSelect).not.toHaveProperty("reviews");
  });

  it("reads only the author's display name, never their id or email", () => {
    expect(studentIdeaSelect.author).toEqual({ select: { displayName: true } });
  });
});

describe("author and leader selects", () => {
  it("the author select adds only the latest review", () => {
    expect(authorIdeaSelect).toMatchObject({
      reviews: { select: { decision: true, reason: true }, take: 1 },
    });
    expect(authorIdeaSelect).not.toHaveProperty("supports");
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

describe("isPublic", () => {
  it("is approved posts only, so pending, declined, and withdrawn never match", () => {
    expect(isPublic).toEqual({ reviewStatus: "approved" });
  });
});
