import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";

// The notification setting action's own checks (#211): origin first, then the session,
// then the rule. Headers, session, database, and store are fakes.
const student: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000b3", email: "maya@example.com", name: "Maya" },
  positions: [],
  roles: rolesFromPositions([]),
};

let headerValues: Record<string, string | null> = {};
let currentSession: Session | null = student;

const store = { set: vi.fn(async () => undefined) };
const getSession = vi.fn(async () => currentSession);

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));
vi.mock("@/auth/session", () => ({ getSession: () => getSession(), signInUrl: vi.fn() }));
vi.mock("@/db/runtime", () => ({ db: () => ({}) }));
vi.mock("@/db/emailSettingsStore", () => ({ prismaEmailSettingsStore: () => store }));

const own = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
const foreign = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };

describe("setEmailSettingAction (#211)", () => {
  beforeEach(() => {
    headerValues = own;
    currentSession = student;
    store.set.mockClear();
    getSession.mockClear();
  });

  it("refuses a request from another site before the session or the store is touched", async () => {
    headerValues = foreign;
    const { setEmailSettingAction } = await import("./actions");
    expect(await setEmailSettingAction({ type: "digest", on: false })).toEqual({
      ok: false,
      error: { code: "cross_origin" },
    });
    expect(getSession).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("signed out returns signed_out and writes nothing", async () => {
    currentSession = null;
    const { setEmailSettingAction } = await import("./actions");
    expect(await setEmailSettingAction({ type: "digest", on: false })).toEqual({
      ok: false,
      error: { code: "signed_out" },
    });
    expect(store.set).not.toHaveBeenCalled();
  });

  it("saves the setting for the signed-in student", async () => {
    const { setEmailSettingAction } = await import("./actions");
    expect(await setEmailSettingAction({ type: "post_status", on: false })).toEqual({
      ok: true,
      type: "post_status",
      on: false,
    });
    expect(store.set).toHaveBeenCalledWith(
      { id: student.user.id, email: student.user.email, displayName: student.user.name },
      "post_status",
      false,
    );
  });

  it("returns invalid for an unknown type", async () => {
    const { setEmailSettingAction } = await import("./actions");
    expect(await setEmailSettingAction({ type: "reviewer_reminder", on: false })).toEqual({
      ok: false,
      error: { code: "invalid" },
    });
    expect(store.set).not.toHaveBeenCalled();
  });
});
