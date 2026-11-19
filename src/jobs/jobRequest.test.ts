import { describe, expect, it, vi } from "vitest";
import { authorizeJob, handleJobRequest } from "./jobRequest";

const SECRET = "s".repeat(40);

describe("authorizeJob (#210)", () => {
  it("accepts the right bearer token", () => {
    expect(authorizeJob(`Bearer ${SECRET}`, SECRET)).toEqual({ ok: true });
  });

  it.each([
    ["no header", null],
    ["a different scheme", `Basic ${SECRET}`],
    ["no token", "Bearer"],
    ["a wrong token", `Bearer ${"x".repeat(40)}`],
    ["a token of another length", "Bearer short"],
    ["the secret with no scheme", SECRET],
    ["a longer token that starts with the secret", `Bearer ${SECRET}extra`],
  ])("answers 401 for %s", (_label, header) => {
    expect(authorizeJob(header, SECRET)).toEqual({ ok: false, status: 401 });
  });

  it("answers 503 when no secret is configured, even for a header that looks right", () => {
    expect(authorizeJob("Bearer anything", undefined)).toEqual({ ok: false, status: 503 });
    expect(authorizeJob("Bearer ", "")).toEqual({ ok: false, status: 503 });
  });
});

describe("handleJobRequest (#210)", () => {
  it.each([
    ["no header", null, SECRET, 401],
    ["Basic auth", `Basic ${SECRET}`, SECRET, 401],
    ["a wrong token", `Bearer ${"x".repeat(40)}`, SECRET, 401],
    ["a token of another length", "Bearer short", SECRET, 401],
    ["an unset secret", `Bearer ${SECRET}`, undefined, 503],
  ])("never calls run for %s", async (_label, authorization, secret, status) => {
    const run = vi.fn(async () => ({ sent: 1 }));
    expect(await handleJobRequest({ authorization, secret, run })).toEqual({ status, body: { ok: false } });
    expect(run).not.toHaveBeenCalled();
  });

  it("runs once with the right token and spreads the result into the body", async () => {
    const run = vi.fn(async () => ({ sent: 2, failed: 0 }));
    expect(await handleJobRequest({ authorization: `Bearer ${SECRET}`, secret: SECRET, run })).toEqual({
      status: 200,
      body: { ok: true, sent: 2, failed: 0 },
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("lets a failing run reject, so the route answers 500", async () => {
    const run = async () => {
      throw new Error("database down");
    };
    await expect(
      handleJobRequest({ authorization: `Bearer ${SECRET}`, secret: SECRET, run }),
    ).rejects.toThrow("database down");
  });
});
