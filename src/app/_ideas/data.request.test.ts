import { beforeEach, describe, expect, it, vi } from "vitest";

// A rejecting connection() stands in for Next's prerender abort, and call order proves the
// clock read waits on it (#223, the same shape as #206). Separate from data.test.ts because
// this file mocks the database path, which that one deliberately avoids.
const { connection, envState, toCard, toPage } = vi.hoisted(() => ({
  connection: vi.fn<() => Promise<void>>(),
  envState: { DATABASE_URL: "postgres://fake" as string | undefined },
  toCard: vi.fn(() => "card"),
  toPage: vi.fn(() => "page"),
}));

vi.mock("next/server", () => ({ connection }));
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {} }));
vi.mock("@/env", () => ({ env: () => ({ APP_ENV: "test", DATABASE_URL: envState.DATABASE_URL }) }));
vi.mock("@/db/runtime", () => ({ db: () => ({}) }));
vi.mock("@/db/publicIdeas", () => ({
  publicIdeaQueries: () => ({ list: async () => [{}], byNumber: async () => ({}) }),
}));
vi.mock("./present", () => ({ toCard, toPage }));

import { getIdea, listWall } from "./data";

const prerenderAbort = new Error("prerender abort");

beforeEach(() => {
  vi.clearAllMocks();
  envState.DATABASE_URL = "postgres://fake";
  connection.mockResolvedValue(undefined);
});

describe("the clock waits for the request (#223)", () => {
  it("does not read the clock for an idea page while prerendering", async () => {
    connection.mockRejectedValue(prerenderAbort);
    await expect(getIdea(131)).rejects.toBe(prerenderAbort);
    expect(toPage).not.toHaveBeenCalled();
  });

  it("does not read the clock for the wall while prerendering", async () => {
    connection.mockRejectedValue(prerenderAbort);
    await expect(listWall()).rejects.toBe(prerenderAbort);
    expect(toCard).not.toHaveBeenCalled();
  });

  it("reads the clock for an idea page only after connection()", async () => {
    expect(await getIdea(131)).toBe("page");
    expect(connection.mock.invocationCallOrder[0]).toBeLessThan(toPage.mock.invocationCallOrder[0]);
  });

  it("reads the clock for the wall only after connection()", async () => {
    expect(await listWall()).toEqual(["card"]);
    expect(connection.mock.invocationCallOrder[0]).toBeLessThan(toCard.mock.invocationCallOrder[0]);
  });

  it("waits on connection() for the sample ideas too", async () => {
    envState.DATABASE_URL = undefined;
    connection.mockRejectedValue(prerenderAbort);
    await expect(getIdea(131)).rejects.toBe(prerenderAbort);
    await expect(listWall()).rejects.toBe(prerenderAbort);
  });
});
