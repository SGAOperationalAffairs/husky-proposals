import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}

let requestHeaders: Record<string, string> = {};
const { endSession } = vi.hoisted(() => ({ endSession: vi.fn(async () => {}) }));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => requestHeaders[name] ?? null }),
}));
vi.mock("@/auth/session", () => ({ endSession }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

import { signOut } from "./actions";

beforeEach(() => {
  endSession.mockClear();
  requestHeaders = {};
});

describe("stand-in sign-out action (#177)", () => {
  it("does nothing for a request from another origin, and goes home", async () => {
    requestHeaders = { origin: "https://evil.example", host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject({ to: "/" });
    expect(endSession).not.toHaveBeenCalled();
  });

  it("does nothing when the origin is missing", async () => {
    requestHeaders = { host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject({ to: "/" });
    expect(endSession).not.toHaveBeenCalled();
  });

  it("ends the session for our own origin, and goes home", async () => {
    requestHeaders = { origin: "http://localhost:3000", host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject({ to: "/" });
    expect(endSession).toHaveBeenCalledOnce();
  });
});
