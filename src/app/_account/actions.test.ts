import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let requestHeaders: Record<string, string> = {};
let appEnv = "dev";
const { endSession } = vi.hoisted(() => ({ endSession: vi.fn(async () => {}) }));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => requestHeaders[name] ?? null }),
}));
vi.mock("@/auth/session", () => ({ endSession }));
vi.mock("@/env", () => ({ env: () => ({ APP_ENV: appEnv }) }));

import { signOut } from "./actions";

// The real redirect is used: reportThrows only lets Next's own redirect error through.
const redirectedHome = { digest: expect.stringContaining("NEXT_REDIRECT;replace;/;") };

beforeEach(() => {
  endSession.mockReset();
  endSession.mockImplementation(async () => {});
  requestHeaders = {};
  appEnv = "dev";
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("stand-in sign-out action (#177, #258)", () => {
  it("does nothing for a request from another origin, and goes home", async () => {
    requestHeaders = { origin: "https://evil.example", host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject(redirectedHome);
    expect(endSession).not.toHaveBeenCalled();
  });

  it("does nothing when the origin is missing", async () => {
    requestHeaders = { host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject(redirectedHome);
    expect(endSession).not.toHaveBeenCalled();
  });

  it("ends the session for our own origin, and goes home", async () => {
    requestHeaders = { origin: "http://localhost:3000", host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject(redirectedHome);
    expect(endSession).toHaveBeenCalledOnce();
  });

  it("reports a throw on dev: nothing reaches the browser, and it is logged", async () => {
    requestHeaders = { origin: "http://localhost:3000", host: "localhost:3000" };
    const error = new Error("session store is down");
    endSession.mockRejectedValue(error);
    await expect(signOut()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith("signOut:", error);
  });

  it("rethrows the same error in production", async () => {
    appEnv = "production";
    requestHeaders = { origin: "http://localhost:3000", host: "localhost:3000" };
    const error = new Error("session store is down");
    endSession.mockRejectedValue(error);
    await expect(signOut()).rejects.toBe(error);
  });
});
