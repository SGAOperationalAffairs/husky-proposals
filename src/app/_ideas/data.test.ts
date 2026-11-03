import { describe, expect, it, vi } from "vitest";
import { IDEAS } from "@/playground/sample";
import { getIdea, listWall, parseIdeasNumber } from "./data";
import { ideasHref } from "./filter";

// No database: the sample path, as in browser tests and agent worktrees (#60). The
// environment is read on first use, after these stubs.
vi.stubEnv("APP_ENV", "test");
vi.stubEnv("DATABASE_URL", "");

describe("the ideas pages' entry (#60)", () => {
  it("lists the sample ideas when there is no database", async () => {
    expect(await listWall()).toHaveLength(IDEAS.length);
  });

  it("finds a sample idea by its public number, and nothing for an unknown one", async () => {
    expect((await getIdea(131))?.title).toBe("A late-night dining option on weeknights");
    expect(await getIdea(9999)).toBeUndefined();
  });

  it("reads the number from the URL strictly", () => {
    expect(parseIdeasNumber("131")).toBe(131);
    for (const bad of ["abc", "0", "-1", "1.5", "131abc", ""]) expect(parseIdeasNumber(bad)).toBeUndefined();
  });
});

describe("the wall's links (#61, #55)", () => {
  it("writes short, shareable URLs that leave defaults out", () => {
    expect(ideasHref("/", { sort: "support" })).toBe("/");
    expect(ideasHref("/", { board: "CSC", sort: "newest" })).toBe("/?board=CSC&sort=newest");
  });
});
