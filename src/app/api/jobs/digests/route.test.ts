import { beforeEach, describe, expect, it, vi } from "vitest";

// The route's own checks (#212): a request without the job secret never reaches the
// database or the pass. The pass itself runs against Postgres in digest.db.test.ts.
const SECRET = "s".repeat(40);
const LINK_SECRET = "l".repeat(40);
let environment: {
  APP_ENV: string;
  DATABASE_URL?: string;
  JOBS_SECRET?: string;
  EMAIL_LINK_SECRET?: string;
};
const tx = { marker: "tx" };
const transaction = vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(tx));
const db = vi.fn(() => ({ $transaction: transaction }));
const queueDigests = vi.fn<(...args: unknown[]) => Promise<{ cohort: number; queued: number }>>(async () => ({
  cohort: 215,
  queued: 120,
}));

vi.mock("@/env", () => ({ env: () => environment }));
vi.mock("@/db/runtime", () => ({ db: () => db() }));
vi.mock("@/db/digest", () => ({ queueDigests: (...args: unknown[]) => queueDigests(...args) }));

const post = (headers: Record<string, string> = {}) =>
  new Request("https://proposals.example.com/api/jobs/digests", { method: "POST", headers });
const authorized = { authorization: `Bearer ${SECRET}` };

describe("POST /api/jobs/digests (#212)", () => {
  beforeEach(() => {
    environment = {
      APP_ENV: "dev",
      DATABASE_URL: "postgresql://user:pw@host-pooler.example.com/db",
      JOBS_SECRET: SECRET,
      EMAIL_LINK_SECRET: LINK_SECRET,
    };
    db.mockClear();
    transaction.mockClear();
    queueDigests.mockClear();
  });

  it("answers 401 with no header and never touches the database or the pass", async () => {
    const { POST } = await import("./route");
    const response = await POST(post());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
    expect(db).not.toHaveBeenCalled();
    expect(queueDigests).not.toHaveBeenCalled();
  });

  it("answers 401 for a wrong bearer token and never calls the pass", async () => {
    const { POST } = await import("./route");
    const response = await POST(post({ authorization: `Bearer ${"x".repeat(40)}` }));
    expect(response.status).toBe(401);
    expect(db).not.toHaveBeenCalled();
    expect(queueDigests).not.toHaveBeenCalled();
  });

  it("answers 503 when JOBS_SECRET is not set", async () => {
    environment.JOBS_SECRET = undefined;
    const { POST } = await import("./route");
    const response = await POST(post(authorized));
    expect(response.status).toBe(503);
    expect(queueDigests).not.toHaveBeenCalled();
  });

  it("fails the run, and queues nothing, when the link secret is not set", async () => {
    environment.EMAIL_LINK_SECRET = undefined;
    const { POST } = await import("./route");
    await expect(POST(post(authorized))).rejects.toThrow(/EMAIL_LINK_SECRET/);
    expect(db).not.toHaveBeenCalled();
    expect(queueDigests).not.toHaveBeenCalled();
  });

  it("fails the run, and queues nothing, in a run with no database", async () => {
    environment = { APP_ENV: "local", JOBS_SECRET: SECRET, EMAIL_LINK_SECRET: LINK_SECRET };
    const { POST } = await import("./route");
    await expect(POST(post(authorized))).rejects.toThrow(/no database/);
    expect(db).not.toHaveBeenCalled();
    expect(queueDigests).not.toHaveBeenCalled();
  });

  it("with the right secret calls the pass once, in one transaction, and answers its counts", async () => {
    const { POST } = await import("./route");
    const response = await POST(post(authorized));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, cohort: 215, queued: 120 });
    expect(queueDigests).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(queueDigests).toHaveBeenCalledWith(tx, expect.any(Date), { linkSecret: LINK_SECRET });
  });
});
