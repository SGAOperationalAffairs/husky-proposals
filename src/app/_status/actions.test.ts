import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";

// The status actions' own checks (#98): origin first, then the session, then the rules.
// Headers, session, database, store, and the cache are fakes.
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

const statusStore = {
  find: vi.fn(),
  boardLoad: vi.fn(async () => [] as (string | null)[]),
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
vi.mock("@/db/statusStore", () => ({ prismaStatusStore: () => statusStore }));

const own = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
const foreign = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };

const found = (overrides: Record<string, unknown> = {}) => ({
  id: IDEA,
  number: 103,
  boardId: "DAB",
  reviewStatus: "approved",
  status: "collecting_support",
  waitingReason: null,
  scale: "small",
  guideline: 2,
  ...overrides,
});

describe("status actions (#98)", () => {
  beforeEach(() => {
    headerValues = own;
    currentSession = vp;
    for (const fn of [statusStore.find, statusStore.boardLoad, statusStore.record]) fn.mockClear();
    getSession.mockClear();
    updateTag.mockClear();
    statusStore.find.mockResolvedValue(found());
  });

  it("refuses a request from another site before the session or the store is touched, for all three", async () => {
    headerValues = foreign;
    const actions = await import("./actions");
    const calls = [
      actions.startIdea({ ideaId: IDEA }),
      actions.holdIdea({ ideaId: IDEA, reason: "Busy" }),
      actions.deliverIdea({ ideaId: IDEA }),
    ];
    for (const result of await Promise.all(calls)) {
      expect(result).toEqual({ ok: false, error: { code: "cross_origin" } });
    }
    expect(getSession).not.toHaveBeenCalled();
    expect(statusStore.find).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("signed out returns signed_out and touches no store", async () => {
    currentSession = null;
    const actions = await import("./actions");
    expect(await actions.startIdea({ ideaId: IDEA })).toEqual({ ok: false, error: { code: "signed_out" } });
    expect(statusStore.find).not.toHaveBeenCalled();
  });

  it("a successful start refreshes the wall and the idea page", async () => {
    const actions = await import("./actions");
    expect(await actions.startIdea({ ideaId: IDEA })).toEqual({
      ok: true,
      status: "in_progress",
      number: 103,
    });
    expect(updateTag.mock.calls).toEqual([["ideas"], ["idea:103"]]);
  });

  it("a successful hold and deliver refresh too", async () => {
    const actions = await import("./actions");
    expect(await actions.holdIdea({ ideaId: IDEA, reason: "It overlaps with another idea" })).toMatchObject({
      ok: true,
      status: "waiting",
    });
    statusStore.find.mockResolvedValue(found({ status: "in_progress" }));
    expect(await actions.deliverIdea({ ideaId: IDEA })).toMatchObject({ ok: true, status: "delivered" });
    expect(updateTag).toHaveBeenCalledTimes(4);
  });

  it("a refusal, a heads-up, and a lost race never refresh a tag", async () => {
    const actions = await import("./actions");

    currentSession = dabChair;
    statusStore.find.mockResolvedValue(found({ boardId: "CPAB" }));
    expect(await actions.startIdea({ ideaId: IDEA })).toEqual({ ok: false, error: { code: "not_allowed" } });

    statusStore.find.mockResolvedValue(found());
    statusStore.boardLoad.mockResolvedValueOnce(["small", "small"]);
    expect(await actions.startIdea({ ideaId: IDEA })).toMatchObject({
      ok: false,
      error: { code: "heads_up" },
    });

    statusStore.record.mockResolvedValueOnce(null as never);
    expect(await actions.startIdea({ ideaId: IDEA })).toEqual({
      ok: false,
      error: { code: "already_changed" },
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
