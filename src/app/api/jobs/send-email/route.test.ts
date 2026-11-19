import { beforeEach, describe, expect, it, vi } from "vitest";

// The route's own checks (#210): a request without the secret never reaches the database or
// the mailer. The happy path runs against Postgres in sendEmailJob.db.test.ts.
const SECRET = "s".repeat(40);
let jobsSecret: string | undefined = SECRET;
const db = vi.fn();
const mailerFromEnv = vi.fn();

vi.mock("@/env", () => ({
  env: () => ({ JOBS_SECRET: jobsSecret, SITE_URL: "https://proposals.example.com" }),
}));
vi.mock("@/db/runtime", () => ({ db: () => db() }));
vi.mock("@/email/mailer", () => ({ mailerFromEnv: (...args: unknown[]) => mailerFromEnv(...args) }));

const post = (headers: Record<string, string> = {}) =>
  new Request("https://proposals.example.com/api/jobs/send-email", { method: "POST", headers });

describe("POST /api/jobs/send-email (#210)", () => {
  beforeEach(() => {
    jobsSecret = SECRET;
    db.mockClear();
    mailerFromEnv.mockClear();
  });

  it("answers 401 with no header and touches neither the database nor the mailer", async () => {
    const { POST } = await import("./route");
    const response = await POST(post());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    expect(db).not.toHaveBeenCalled();
    expect(mailerFromEnv).not.toHaveBeenCalled();
  });

  it("answers 401 for a wrong bearer token the same way", async () => {
    const { POST } = await import("./route");
    const response = await POST(post({ authorization: `Bearer ${"x".repeat(40)}` }));
    expect(response.status).toBe(401);
    expect(db).not.toHaveBeenCalled();
    expect(mailerFromEnv).not.toHaveBeenCalled();
  });

  it("answers 503 when JOBS_SECRET is not set", async () => {
    jobsSecret = undefined;
    const { POST } = await import("./route");
    const response = await POST(post({ authorization: `Bearer ${SECRET}` }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
    expect(db).not.toHaveBeenCalled();
    expect(mailerFromEnv).not.toHaveBeenCalled();
  });
});
