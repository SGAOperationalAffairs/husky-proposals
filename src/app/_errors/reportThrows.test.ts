import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";

let appEnv = "dev";
vi.mock("@/env", () => ({ env: () => ({ APP_ENV: appEnv }) }));

import { reportThrows } from "./reportThrows";

describe("reportThrows (#191)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes a normal result through", async () => {
    const wrapped = reportThrows("setSupport", async (n: number) => ({ ok: true as const, n }));
    expect(await wrapped(3)).toEqual({ ok: true, n: 3 });
  });

  it.each(["dev", "preview", "test"])("returns unexpected with the message in %s", async (env) => {
    appEnv = env;
    const wrapped = reportThrows("postIdea", async () => {
      throw new Error("database is down");
    });
    expect(await wrapped()).toEqual({
      ok: false,
      error: { code: "unexpected", report: { message: "postIdea: database is down" } },
    });
  });

  it("rethrows the same error in production, so production is unchanged", async () => {
    appEnv = "production";
    const error = new Error("database is down");
    const wrapped = reportThrows("postIdea", async () => {
      throw error;
    });
    await expect(wrapped()).rejects.toBe(error);
  });

  it("logs the action name and the error, because catching means Next no longer does", async () => {
    appEnv = "dev";
    const error = new Error("nope");
    await reportThrows("setFollowing", async () => {
      throw error;
    })();
    expect(console.error).toHaveBeenCalledWith("setFollowing:", error);
  });

  it("lets a redirect pass through", async () => {
    appEnv = "dev";
    const wrapped = reportThrows("postIdea", async () => redirect("/somewhere"));
    await expect(wrapped()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });

  it("lets notFound pass through", async () => {
    appEnv = "dev";
    const wrapped = reportThrows("postIdea", async () => notFound());
    await expect(wrapped()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK"),
    });
  });
});
