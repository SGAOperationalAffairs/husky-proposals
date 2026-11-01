import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}

const { startStandInSession } = vi.hoisted(() => ({
  startStandInSession: vi.fn<(slug: string) => Promise<{ ok: boolean }>>(async () => ({ ok: true })),
}));

vi.mock("@/auth/session", () => ({ startStandInSession, endSession: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

import { signInAs } from "./actions";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeEach(() => {
  startStandInSession.mockClear();
  startStandInSession.mockResolvedValue({ ok: true });
});

describe("stand-in actions (#93)", () => {
  it("signs in and goes to a valid next", async () => {
    await expect(signInAs(form({ user: "student", next: "/post" }))).rejects.toMatchObject({ to: "/post" });
    expect(startStandInSession).toHaveBeenCalledWith("student");
  });

  it("stays on the picker when next is missing", async () => {
    await expect(signInAs(form({ user: "student" }))).rejects.toMatchObject({ to: "/stand-in" });
  });

  it("stays on the picker rather than leave the site for a hostile next", async () => {
    await expect(signInAs(form({ user: "student", next: "//evil.com" }))).rejects.toMatchObject({
      to: "/stand-in",
    });
    expect(startStandInSession).toHaveBeenCalledWith("student");
  });

  it("starts no session for an invalid user", async () => {
    await expect(signInAs(form({ user: "nobody", next: "/post" }))).rejects.toMatchObject({
      to: "/stand-in",
    });
    expect(startStandInSession).not.toHaveBeenCalled();
  });

  it("stays on the picker when the session did not start", async () => {
    startStandInSession.mockResolvedValue({ ok: false });
    await expect(signInAs(form({ user: "student", next: "/post" }))).rejects.toMatchObject({
      to: "/stand-in",
    });
  });
});
