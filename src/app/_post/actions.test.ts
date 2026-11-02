import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";

// The post action's own checks (#54): the origin is checked before the session or the
// store is touched. The headers, session, and store are fakes.
const store = { countPending: vi.fn(async () => 0), create: vi.fn(async () => ({ id: "idea-1" })) };
const session: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000a1", email: "maya@example.com", name: "Maya Test" },
  positions: [],
  roles: rolesFromPositions([]),
};
let headerValues: Record<string, string | null> = {};

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
}));
vi.mock("@/auth/session", () => ({ getSession: async () => session }));
vi.mock("@/db/runtime", () => ({ db: () => ({}) }));
vi.mock("@/db/postStore", () => ({ prismaPostStore: () => store }));

const valid = {
  title: "Later dining hours",
  summary: "The dining hall closes early on Sundays.",
  category: "dining",
};

describe("postIdea action (#54)", () => {
  beforeEach(() => {
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
    headerValues = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
    const { postIdea } = await import("./actions");
    expect(await postIdea(valid)).toEqual({ ok: true, id: "idea-1" });
    expect(store.create).toHaveBeenCalledOnce();
  });
});
