import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";

// The post actions' own checks (#54, #56): the origin is checked before the session or a
// store is touched. The headers, session, and stores are fakes.
const IDEA = "00000000-0000-4000-8000-000000000101";
const store = { countPending: vi.fn(async () => 0), create: vi.fn(async () => ({ id: "idea-1" })) };
const ownStore = {
  find: vi.fn(),
  countPending: vi.fn(async () => 0),
  resubmit: vi.fn(async () => true),
  withdraw: vi.fn(async () => true),
};
const transaction = vi.fn(async (fn: (tx: object) => unknown) => fn({}));
const session: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000a1", email: "maya@example.com", name: "Maya Test" },
  positions: [],
  roles: rolesFromPositions([]),
};
let headerValues: Record<string, string | null> = {};
let currentSession: Session | null = session;
const getSession = vi.fn(async () => currentSession);

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));
let appEnv = "test";
vi.mock("@/env", () => ({ env: () => ({ APP_ENV: appEnv }) }));
vi.mock("@/auth/session", () => ({ getSession: () => getSession(), signInUrl: vi.fn() }));
vi.mock("@/db/runtime", () => ({ db: () => ({ $transaction: transaction }) }));
vi.mock("@/db/postStore", () => ({ prismaPostStore: () => store }));
vi.mock("@/db/ownPostStore", () => ({ prismaOwnPostStore: () => ownStore }));

const own = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
const valid = {
  title: "Later dining hours",
  summary: "The dining hall closes early on Sundays.",
  details:
    "The dining hall closes early on Sundays, so students who finish class late have no hot meal on campus.",
  category: "dining",
};

describe("postIdea action (#54)", () => {
  beforeEach(() => {
    currentSession = session;
    store.countPending.mockClear();
    store.create.mockClear();
  });

  it("refuses a request from another site before reading the session or writing", async () => {
    headerValues = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };
    const { postIdea } = await import("./actions");
    expect(await postIdea(valid)).toEqual({ ok: false, error: { code: "cross_origin" } });
    expect(store.countPending).not.toHaveBeenCalled();
    expect(store.create).not.toHaveBeenCalled();
  });

  it("saves a post from our own origin", async () => {
    headerValues = own;
    const { postIdea } = await import("./actions");
    expect(await postIdea(valid)).toEqual({ ok: true, id: "idea-1" });
    expect(store.create).toHaveBeenCalledOnce();
  });
});

describe("a store that throws (#191)", () => {
  beforeEach(() => {
    currentSession = session;
    headerValues = own;
    store.countPending.mockRejectedValueOnce(new Error("database is down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("gives an unexpected result with the message when errors are shown", async () => {
    appEnv = "test";
    const { postIdea } = await import("./actions");
    expect(await postIdea(valid)).toEqual({
      ok: false,
      error: { code: "unexpected", report: { message: "postIdea: database is down" } },
    });
  });

  it("rethrows in production", async () => {
    appEnv = "production";
    const { postIdea } = await import("./actions");
    await expect(postIdea(valid)).rejects.toThrow("database is down");
  });
});

describe("resubmit and withdraw actions (#56)", () => {
  beforeEach(() => {
    currentSession = session;
    getSession.mockClear();
    transaction.mockClear();
    for (const fn of Object.values(ownStore)) fn.mockClear();
    ownStore.find.mockResolvedValue({
      id: IDEA,
      authorId: session.user.id,
      reviewStatus: "declined",
      latestVersion: 1,
    });
  });

  it("refuses a request from another site before the session or a store is touched, for both", async () => {
    headerValues = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };
    const actions = await import("./actions");
    const results = await Promise.all([
      actions.resubmitIdea({ ...valid, ideaId: IDEA }),
      actions.withdrawIdea({ ideaId: IDEA }),
    ]);
    for (const result of results) expect(result).toEqual({ ok: false, error: { code: "cross_origin" } });
    expect(getSession).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(ownStore.find).not.toHaveBeenCalled();
  });

  it("signed out returns signed_out and touches no store", async () => {
    headerValues = own;
    currentSession = null;
    const actions = await import("./actions");
    const signedOut = { ok: false, error: { code: "signed_out" } };
    expect(await actions.resubmitIdea({ ...valid, ideaId: IDEA })).toEqual(signedOut);
    expect(await actions.withdrawIdea({ ideaId: IDEA })).toEqual(signedOut);
    expect(transaction).not.toHaveBeenCalled();
    expect(ownStore.find).not.toHaveBeenCalled();
  });

  it("a successful call runs the rules inside the transaction", async () => {
    headerValues = own;
    const actions = await import("./actions");
    expect(await actions.resubmitIdea({ ...valid, ideaId: IDEA })).toEqual({
      ok: true,
      id: IDEA,
      version: 2,
    });
    expect(await actions.withdrawIdea({ ideaId: IDEA })).toEqual({ ok: true, id: IDEA });
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(ownStore.resubmit).toHaveBeenCalledOnce();
    expect(ownStore.withdraw).toHaveBeenCalledOnce();
  });
});
