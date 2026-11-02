import { beforeEach, describe, expect, it } from "vitest";
import { BOARDS } from "@/core/boards";
import {
  buildApprovedIdea,
  buildBoard,
  buildFollow,
  buildIdea,
  buildParticipation,
  buildReview,
  buildRevision,
  buildUpdate,
  buildUser,
  FIXTURE_TIME,
  resetFactories,
  testUuid,
} from "./factories";
import { boards, ideas, users } from "./fixtures";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("factories (#43)", () => {
  beforeEach(resetFactories);

  it("gives every record a unique, valid id", () => {
    const ids = [buildUser().id, buildUser().id, buildIdea().id, buildApprovedIdea().id];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID);
    expect(testUuid(7)).toBe("00000000-0000-4000-8000-000000000007");
  });

  it("leaves status empty unless the idea is approved", () => {
    expect(buildIdea()).toMatchObject({ reviewStatus: "pending", status: null });
    const approved = buildApprovedIdea();
    expect(approved).toMatchObject({ reviewStatus: "approved", status: "collecting_support" });
    expect(approved.number).toBeTypeOf("number");
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it("requires a reason for a waiting idea", () => {
    expect(() => buildApprovedIdea({ status: "waiting" })).toThrow(/waitingReason/);
    expect(buildApprovedIdea({ status: "waiting", waitingReason: "Needs a budget answer." }).status).toBe(
      "waiting",
    );
  });

  it("matches an idea's category to its board", () => {
    expect(buildIdea({ boardId: "GIB" }).category).toBe("green_initiatives");
    expect(buildIdea({ boardId: "CPAB" }).category).toBe("campus_planning");
    expect(buildBoard("CSC").category).toBe("campus_services");
    for (const board of boards) expect(board.name).toBe(BOARDS[board.id as keyof typeof BOARDS].name);
  });

  it("restarts numbering after resetFactories()", () => {
    const first = buildUser();
    buildUser();
    resetFactories();
    expect(buildUser()).toEqual(first);
    expect(buildUpdate({ ideaId: testUuid(1) }).id).toMatch(UUID);
  });

  it("keeps all fixture data invented: only example.com addresses and no real names", () => {
    for (const user of Object.values(users)) {
      expect(user.email).toMatch(/@example\.com$/);
      expect(user.displayName).toMatch(/Test|Chair|Campus-Affairs/);
    }
    expect(Object.keys(ideas)).toContain("pending");
  });
});

describe("revision, review, participation, and follow builders (#44)", () => {
  it("a v1 revision copies the idea's content and submission time", () => {
    const idea = buildApprovedIdea({ id: testUuid(300), title: "Copied", description: "Same words" });
    const revision = buildRevision(idea);
    expect(revision).toMatchObject({
      ideaId: idea.id,
      version: 1,
      title: "Copied",
      description: "Same words",
      isAnonymous: false,
      submittedAt: idea.submittedAt,
    });
  });

  it("a review points at its revision and carries the decision and reason", () => {
    const review = buildReview({
      ideaId: testUuid(300),
      revisionId: testUuid(301),
      decision: "declined",
      reason: "Too similar to an open idea.",
    });
    expect(review).toMatchObject({
      kind: "review",
      decision: "declined",
      reason: "Too similar to an open idea.",
    });
  });

  it("a participation and a follow stamp their times with the fixture clock", () => {
    const participation = buildParticipation({ userId: testUuid(1), ideaId: testUuid(300) });
    expect(participation.createdAt).toEqual(FIXTURE_TIME);
    expect(participation.updatedAt).toEqual(FIXTURE_TIME);
    expect(buildFollow({ userId: testUuid(1), ideaId: testUuid(300) }).createdAt).toEqual(FIXTURE_TIME);
  });
});
