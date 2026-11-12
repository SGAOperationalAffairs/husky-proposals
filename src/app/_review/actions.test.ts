import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";

// The review actions' own checks (#58): origin first, then the session, then the rules.
// Headers, session, database, stores, and the cache are fakes.
const IDEA = "00000000-0000-4000-8000-000000000101";

const vp: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000b4", email: "vp@example.com", name: "Vic" },
  positions: [{ key: VP_CAMPUS_AFFAIRS, name: "VP of Campus Affairs" }],
  roles: rolesFromPositions([VP_CAMPUS_AFFAIRS]),
};
const dabChair: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000b1", email: "chair@example.com", name: "Dana" },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};

let headerValues: Record<string, string | null> = {};
let currentSession: Session | null = vp;

const reviewStore = {
  find: vi.fn(),
  nextNumber: vi.fn(async () => 157),
  record: vi.fn(async () => ({ reviewId: "r-1" })),
};
const boardStore = { setReviewDueDays: vi.fn(async () => {}) };
const getSession = vi.fn(async () => currentSession);
const updateTag = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
}));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => updateTag(tag) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth/session", () => ({ getSession: () => getSession(), signInUrl: vi.fn() }));
// The transaction runs its callback with a placeholder client the stores ignore.
vi.mock("@/db/runtime", () => ({
  db: () => ({ $transaction: async (fn: (tx: object) => unknown) => fn({}) }),
}));
vi.mock("@/db/reviewStore", () => ({ prismaReviewStore: () => reviewStore }));
vi.mock("@/db/boardSettingsStore", () => ({ prismaBoardSettingsStore: () => boardStore }));

const own = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
const foreign = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };

const pending = (boardId = "DAB") => ({
  id: IDEA,
  boardId,
  authorId: "00000000-0000-4000-8000-0000000000a1",
  reviewStatus: "pending",
  number: null,
  latestRevisionId: "00000000-0000-4000-8000-000000000301",
});

describe("review actions (#58)", () => {
  beforeEach(() => {
    headerValues = own;
    currentSession = vp;
    for (const fn of [reviewStore.find, reviewStore.nextNumber, reviewStore.record]) fn.mockClear();
    boardStore.setReviewDueDays.mockClear();
    getSession.mockClear();
    updateTag.mockClear();
    reviewStore.find.mockResolvedValue(pending());
  });

  it("refuses a request from another site before the session or a store is touched, for all four actions", async () => {
    headerValues = foreign;
    const actions = await import("./actions");
    const calls = [
      actions.approvePost({ ideaId: IDEA }),
      actions.declinePost({ ideaId: IDEA, reason: "No" }),
      actions.takeDownPost({ ideaId: IDEA, reason: "No" }),
      actions.setReviewDueDays({ boardId: "DAB", days: 3 }),
    ];
    for (const result of await Promise.all(calls)) {
      expect(result).toEqual({ ok: false, error: { code: "cross_origin" } });
    }
    expect(getSession).not.toHaveBeenCalled();
    expect(reviewStore.find).not.toHaveBeenCalled();
    expect(boardStore.setReviewDueDays).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("signed out returns signed_out and touches no store", async () => {
    currentSession = null;
    const actions = await import("./actions");
    expect(await actions.approvePost({ ideaId: IDEA })).toEqual({ ok: false, error: { code: "signed_out" } });
    expect(await actions.setReviewDueDays({ boardId: "DAB", days: 3 })).toEqual({
      ok: false,
      error: { code: "signed_out" },
    });
    expect(reviewStore.find).not.toHaveBeenCalled();
    expect(boardStore.setReviewDueDays).not.toHaveBeenCalled();
  });

  it("a successful approve refreshes both public tags", async () => {
    const actions = await import("./actions");
    expect(await actions.approvePost({ ideaId: IDEA })).toMatchObject({ ok: true, number: 157 });
    expect(updateTag.mock.calls).toEqual([["ideas"], ["idea:157"]]);
  });

  it("a successful take-down refreshes both tags, and a decline refreshes none", async () => {
    const actions = await import("./actions");
    reviewStore.find.mockResolvedValue({ ...pending(), reviewStatus: "approved", number: 131 });
    expect(await actions.takeDownPost({ ideaId: IDEA, reason: "Not accurate" })).toMatchObject({ ok: true });
    expect(updateTag.mock.calls).toEqual([["ideas"], ["idea:131"]]);

    updateTag.mockClear();
    reviewStore.find.mockResolvedValue(pending());
    expect(
      await actions.declinePost({
        ideaId: IDEA,
        reason: "Already planned for spring, so it cannot take a new slot this year",
      }),
    ).toMatchObject({
      ok: true,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("a refused decision never refreshes a tag", async () => {
    currentSession = dabChair;
    reviewStore.find.mockResolvedValue(pending("CPAB"));
    const actions = await import("./actions");
    expect(await actions.approvePost({ ideaId: IDEA })).toEqual({
      ok: false,
      error: { code: "not_allowed" },
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("a successful setReviewDueDays writes once and refreshes nothing", async () => {
    const actions = await import("./actions");
    expect(await actions.setReviewDueDays({ boardId: "CPAB", days: 5 })).toEqual({
      ok: true,
      boardId: "CPAB",
      reviewDueDays: 5,
    });
    expect(boardStore.setReviewDueDays).toHaveBeenCalledWith("CPAB", 5);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("the rules' session is the live one", () => {
  it("passes the signed-in session to the rules, so a chair is limited to their board", async () => {
    headerValues = own;
    currentSession = dabChair;
    const actions = await import("./actions");
    expect(await actions.setReviewDueDays({ boardId: "CPAB", days: 5 })).toEqual({
      ok: false,
      error: { code: "not_allowed" },
    });
  });
});
