import { describe, expect, it } from "vitest";
import { listIdeas, parseIdeasQuery } from "./data";

describe("ideas list stand-in (#61)", () => {
  it("shows only ideas still open for support, most supported first", () => {
    const ideas = listIdeas(parseIdeasQuery({}));
    expect(ideas.length).toBeGreaterThan(0);
    for (const i of ideas) expect(["collecting_support", "under_review", "waiting"]).toContain(i.status);
    const counts = ideas.map((i) => i.supportCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("filters by board, status, and search words", () => {
    expect(listIdeas(parseIdeasQuery({ board: "GIB" })).every((i) => i.board === "GIB")).toBe(true);
    expect(listIdeas(parseIdeasQuery({ status: "waiting" })).every((i) => i.status === "waiting")).toBe(true);
    const found = listIdeas(parseIdeasQuery({ q: "  WALK signal " }));
    expect(found.map((i) => i.number)).toEqual([151]);
  });

  it("sorts newest first by proposal number", () => {
    const numbers = listIdeas(parseIdeasQuery({ sort: "newest" })).map((i) => i.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
  });

  it("ignores values it does not know instead of failing", () => {
    expect(parseIdeasQuery({ board: "XYZ", status: "in_progress", sort: "random", q: ["a", "b"] })).toEqual({
      sort: "support",
    });
  });
});
