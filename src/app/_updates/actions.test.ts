import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";

// The post-update action's own checks (#130): origin first, then the session, then the
// rules. Headers, session, database, store, and the cache are fakes.
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

const updateStore = {
  find: vi.fn(),
  ensureUser: vi.fn(async () => {}),
  record: vi.fn(async () => ({ updateId: "u-1" })),
};
const getSession = vi.fn(async () => currentSession);
const updateTag = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
}));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => updateTag(tag) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth/session", () => ({ getSession: () => getSession(), signInUrl: vi.fn() }));
// The transaction runs its callback with a placeholder client the store ignores.
vi.mock("@/db/runtime", () => ({
  db: () => ({ $transaction: async (fn: (tx: object) => unknown) => fn({}) }),
}));
vi.mock("@/db/updateStore", () => ({ prismaUpdateStore: () => updateStore }));

const own = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
const foreign = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };

const found = (overrides: Record<string, unknown> = {}) => ({
  id: IDEA,
  number: 103,
  boardId: "DAB",
  reviewStatus: "approved",
  status: "in_progress",
  ...overrides,
});

describe("post update action (#130)", () => {
  beforeEach(() => {
    headerValues = own;
    currentSession = vp;
    for (const fn of [updateStore.find, updateStore.ensureUser, updateStore.record]) fn.mockClear();
    getSession.mockClear();
    updateTag.mockClear();
    updateStore.find.mockResolvedValue(found());
  });

  it("refuses a request from another site before the session or the store is touched", async () => {
    headerValues = foreign;
    const { postUpdateAction } = await import("./actions");
    expect(await postUpdateAction({ ideaId: IDEA, kind: "check_in" })).toEqual({
      ok: false,
      error: { code: "cross_origin" },
    });
    expect(getSession).not.toHaveBeenCalled();
    expect(updateStore.find).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("signed out returns signed_out and touches no store", async () => {
    currentSession = null;
    const { postUpdateAction } = await import("./actions");
    expect(await postUpdateAction({ ideaId: IDEA, kind: "check_in" })).toEqual({
      ok: false,
      error: { code: "signed_out" },
    });
    expect(updateStore.find).not.toHaveBeenCalled();
  });

  it("a successful post refreshes the wall and the idea page", async () => {
    const { postUpdateAction } = await import("./actions");
    expect(await postUpdateAction({ ideaId: IDEA, kind: "board", body: "The committee met." })).toEqual({
      ok: true,
      number: 103,
      kind: "board",
    });
    expect(updateTag.mock.calls).toEqual([["ideas"], ["idea:103"]]);
  });

  it("a successful check-in refreshes too", async () => {
    const { postUpdateAction } = await import("./actions");
    expect(await postUpdateAction({ ideaId: IDEA, kind: "check_in" })).toMatchObject({ ok: true });
    expect(updateTag).toHaveBeenCalledTimes(2);
  });

  it("a refusal never refreshes a tag", async () => {
    const { postUpdateAction } = await import("./actions");

    currentSession = dabChair;
    updateStore.find.mockResolvedValue(found({ boardId: "CPAB" }));
    expect(await postUpdateAction({ ideaId: IDEA, kind: "check_in" })).toEqual({
      ok: false,
      error: { code: "not_allowed" },
    });

    updateStore.find.mockResolvedValue(found({ status: "waiting" }));
    expect(await postUpdateAction({ ideaId: IDEA, kind: "check_in" })).toEqual({
      ok: false,
      error: { code: "not_in_progress" },
    });

    updateStore.find.mockResolvedValue(found());
    expect(await postUpdateAction({ ideaId: IDEA, kind: "board", body: "A [bracket]" })).toEqual({
      ok: false,
      error: { code: "body_placeholder" },
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(updateStore.record).not.toHaveBeenCalled();
  });
});
