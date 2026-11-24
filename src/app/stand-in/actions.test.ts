import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let requestHeaders: Record<string, string> = {};
let appEnv = "dev";
const { endSession, startStandInSession } = vi.hoisted(() => ({
  endSession: vi.fn(async () => {}),
  startStandInSession: vi.fn<(slug: string) => Promise<{ ok: boolean }>>(async () => ({ ok: true })),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => requestHeaders[name] ?? null }),
}));
vi.mock("@/auth/session", () => ({ endSession, startStandInSession }));
vi.mock("@/env", () => ({ env: () => ({ APP_ENV: appEnv }) }));

import { STAND_IN_SLUGS } from "@/auth/standIn";
import { signInAs, signOut } from "./actions";

const ownOrigin = { origin: "http://localhost:3000", host: "localhost:3000" };
const slug = STAND_IN_SLUGS[0];

// The real redirect is used: reportThrows only lets Next's own redirect error through.
const redirectedTo = (path: string) => ({
  digest: expect.stringContaining(`NEXT_REDIRECT;replace;${path};`),
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  endSession.mockReset();
  endSession.mockImplementation(async () => {});
  startStandInSession.mockReset();
  startStandInSession.mockImplementation(async () => ({ ok: true }));
  requestHeaders = {};
  appEnv = "dev";
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("stand-in sign-in action (#258)", () => {
  it("does nothing for a request from another origin", async () => {
    requestHeaders = { origin: "https://evil.example", host: "localhost:3000" };
    await expect(signInAs(form({ user: slug }))).rejects.toMatchObject(redirectedTo("/stand-in"));
    expect(startStandInSession).not.toHaveBeenCalled();
  });

  it("does nothing when the origin is missing", async () => {
    requestHeaders = { host: "localhost:3000" };
    await expect(signInAs(form({ user: slug }))).rejects.toMatchObject(redirectedTo("/stand-in"));
    expect(startStandInSession).not.toHaveBeenCalled();
  });

  it("starts the session from our own origin and follows a safe next path", async () => {
    requestHeaders = ownOrigin;
    await expect(signInAs(form({ user: slug, next: "/ideas" }))).rejects.toMatchObject(
      redirectedTo("/ideas"),
    );
    expect(startStandInSession).toHaveBeenCalledWith(slug);
  });

  it("falls back to /stand-in when next is not a safe path", async () => {
    requestHeaders = ownOrigin;
    await expect(signInAs(form({ user: slug, next: "https://evil.example" }))).rejects.toMatchObject(
      redirectedTo("/stand-in"),
    );
    expect(startStandInSession).toHaveBeenCalledOnce();
  });

  it("starts no session for an unknown user", async () => {
    requestHeaders = ownOrigin;
    await expect(signInAs(form({ user: "nobody" }))).rejects.toMatchObject(redirectedTo("/stand-in"));
    expect(startStandInSession).not.toHaveBeenCalled();
  });

  it("reports a throw on dev: nothing reaches the browser, and it is logged", async () => {
    requestHeaders = ownOrigin;
    const error = new Error("database is down");
    startStandInSession.mockRejectedValue(error);
    await expect(signInAs(form({ user: slug }))).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith("signInAs:", error);
  });

  it("rethrows the same error in production", async () => {
    appEnv = "production";
    requestHeaders = ownOrigin;
    const error = new Error("database is down");
    startStandInSession.mockRejectedValue(error);
    await expect(signInAs(form({ user: slug }))).rejects.toBe(error);
  });
});

describe("stand-in sign-out action (#258)", () => {
  it("does nothing for a request from another origin", async () => {
    requestHeaders = { origin: "https://evil.example", host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject(redirectedTo("/stand-in"));
    expect(endSession).not.toHaveBeenCalled();
  });

  it("does nothing when the origin is missing", async () => {
    requestHeaders = { host: "localhost:3000" };
    await expect(signOut()).rejects.toMatchObject(redirectedTo("/stand-in"));
    expect(endSession).not.toHaveBeenCalled();
  });

  it("ends the session from our own origin", async () => {
    requestHeaders = ownOrigin;
    await expect(signOut()).rejects.toMatchObject(redirectedTo("/stand-in"));
    expect(endSession).toHaveBeenCalledOnce();
  });

  it("reports a throw on dev: nothing reaches the browser, and it is logged", async () => {
    requestHeaders = ownOrigin;
    const error = new Error("session store is down");
    endSession.mockRejectedValue(error);
    await expect(signOut()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith("standInSignOut:", error);
  });

  it("rethrows the same error in production", async () => {
    appEnv = "production";
    requestHeaders = ownOrigin;
    const error = new Error("session store is down");
    endSession.mockRejectedValue(error);
    await expect(signOut()).rejects.toBe(error);
  });
});
