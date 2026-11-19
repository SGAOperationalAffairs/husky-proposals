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

const LINK_SECRET = "k".repeat(40);
const formWith = (token: string) => {
  const form = new FormData();
  form.set("token", token);
  return form;
};

let headerValues: Record<string, string | null> = {};
let currentSession: Session | null = student;

const store = { set: vi.fn(async () => undefined), turnOff: vi.fn(async () => undefined) };
const getSession = vi.fn(async () => currentSession);
const db = vi.fn(() => ({}));
let environment: { APP_ENV: string; DATABASE_URL?: string; EMAIL_LINK_SECRET?: string } = {
  APP_ENV: "dev",
  DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db",
  EMAIL_LINK_SECRET: LINK_SECRET,
};

vi.mock("@/env", () => ({ env: () => environment }));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerValues[name] ?? null }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));
vi.mock("@/auth/session", () => ({ getSession: () => getSession(), signInUrl: vi.fn() }));
vi.mock("@/db/runtime", () => ({ db: () => db() }));
vi.mock("@/db/emailSettingsStore", () => ({ prismaEmailSettingsStore: () => store }));

const own = { origin: "https://proposals.northeasternsga.com", host: "proposals.northeasternsga.com" };
const foreign = { origin: "https://evil.example.com", host: "proposals.northeasternsga.com" };

describe("setEmailSettingAction (#211)", () => {
  beforeEach(() => {
    headerValues = own;
    currentSession = student;
    store.set.mockClear();
    store.turnOff.mockClear();
    getSession.mockClear();
    db.mockClear();
    environment = {
      APP_ENV: "dev",
      DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db",
      EMAIL_LINK_SECRET: LINK_SECRET,
    };
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

describe("unsubscribeAction (#212)", () => {
  const userId = "00000000-0000-4000-8000-0000000000a1";

  beforeEach(() => {
    headerValues = own;
    store.turnOff.mockClear();
    getSession.mockClear();
    db.mockClear();
    environment = {
      APP_ENV: "dev",
      DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db",
      EMAIL_LINK_SECRET: LINK_SECRET,
    };
  });

  it("refuses a request from another site before the database or the store is touched", async () => {
    headerValues = foreign;
    const { signUnsubscribeToken } = await import("@/email/unsubscribeToken");
    const { unsubscribeAction } = await import("./actions");
    const token = signUnsubscribeToken(LINK_SECRET, "digest", userId);
    expect(await unsubscribeAction(null, formWith(token))).toEqual({
      ok: false,
      error: { code: "cross_origin" },
    });
    expect(db).not.toHaveBeenCalled();
    expect(store.turnOff).not.toHaveBeenCalled();
  });

  it("turns the digest off for the token's student, with no session", async () => {
    const { signUnsubscribeToken } = await import("@/email/unsubscribeToken");
    const { unsubscribeAction } = await import("./actions");
    const token = signUnsubscribeToken(LINK_SECRET, "digest", userId);
    expect(await unsubscribeAction(null, formWith(token))).toEqual({ ok: true, type: "digest" });
    expect(store.turnOff).toHaveBeenCalledWith(userId, "digest");
    expect(getSession).not.toHaveBeenCalled();
  });

  it("says invalid for a bad token or a missing field, and writes nothing", async () => {
    const { unsubscribeAction } = await import("./actions");
    expect(await unsubscribeAction(null, formWith("digest.nope.nope"))).toEqual({
      ok: false,
      error: { code: "invalid" },
    });
    expect(await unsubscribeAction(null, new FormData())).toEqual({ ok: false, error: { code: "invalid" } });
    expect(store.turnOff).not.toHaveBeenCalled();
  });

  it("in a run with no database it says done and never touches db()", async () => {
    environment = { APP_ENV: "local" };
    const { unsubscribeAction } = await import("./actions");
    expect(await unsubscribeAction(null, formWith("anything"))).toEqual({ ok: true, type: "digest" });
    expect(db).not.toHaveBeenCalled();
    expect(store.turnOff).not.toHaveBeenCalled();
  });
});
