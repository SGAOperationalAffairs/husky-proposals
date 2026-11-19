import { describe, expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { setEmailSetting, type EmailSettingsStore } from "./setEmailSetting";

const session: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000b3", email: "maya@example.com", name: "Maya" },
  positions: [],
  roles: rolesFromPositions([]),
};

function fakeStore() {
  const calls: { user: { id: string; email: string; displayName: string }; type: string; on: boolean }[] = [];
  const store: EmailSettingsStore = {
    set: async (user, type, on) => {
      calls.push({ user, type, on });
    },
  };
  return { store, calls };
}

describe("setEmailSetting (#211)", () => {
  it("sets the state for the signed-in user from the session, never from the request", async () => {
    const { store, calls } = fakeStore();
    const result = await setEmailSetting(store, session, { type: "post_decided", on: false });
    expect(result).toEqual({ ok: true, type: "post_decided", on: false });
    expect(calls).toEqual([
      {
        user: { id: session.user.id, email: session.user.email, displayName: session.user.name },
        type: "post_decided",
        on: false,
      },
    ]);
  });

  it("ignores a user id in the request", async () => {
    const { store, calls } = fakeStore();
    const result = await setEmailSetting(store, session, {
      type: "digest",
      on: true,
      userId: "00000000-0000-4000-8000-000000000099",
    });
    expect(result.ok).toBe(true);
    expect(calls[0]?.user.id).toBe(session.user.id);
  });

  it("rejects an unknown type, a leader's reminder, and a non-boolean, writing nothing", async () => {
    const { store, calls } = fakeStore();
    for (const raw of [
      { type: "nope", on: true },
      { type: "reviewer_reminder", on: false },
      { type: "digest", on: "yes" },
      { type: "digest" },
      null,
    ]) {
      expect(await setEmailSetting(store, session, raw)).toEqual({ ok: false, error: { code: "invalid" } });
    }
    expect(calls).toEqual([]);
  });
});
