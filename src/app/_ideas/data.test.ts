import { describe, expect, it } from "vitest";
import { getIdea, listIdeas, parseIdeasNumber, parseIdeasQuery } from "./data";

describe("idea page stand-in (#62)", () => {
  it("finds an idea by its public number, and nothing for an unknown one", () => {
    expect(getIdea(131)?.title).toBe("A late-night dining option on weeknights");
    expect(getIdea(9999)).toBeUndefined();
  });

  it("reads the number from the URL strictly", () => {
    expect(parseIdeasNumber("131")).toBe(131);
    for (const bad of ["abc", "0", "-1", "1.5", "131abc", ""]) expect(parseIdeasNumber(bad)).toBeUndefined();
  });

  it("names the author only when the post is not anonymous", () => {
    const named = getIdea(131)!;
    expect(named.author).toBe("Jordan P.");
    const anonymous = getIdea(151)!;
    expect("author" in anonymous).toBe(false);
  });

  it("ranks an idea among its board's ideas that are not delivered", () => {
    expect(getIdea(103)?.rank).toEqual({ position: 1, of: 3, board: "Dining" });
    expect(getIdea(131)?.rank).toEqual({ position: 2, of: 3, board: "Dining" });
    expect(getIdea(174)?.rank).toEqual({ position: 3, of: 3, board: "Dining" });
  });

  it("always gives a waiting idea its reason", () => {
    expect(getIdea(140)?.waitingReason).toBeTruthy();
  });
});

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

describe("in progress list stand-in (#63)", () => {
  it("shows only ideas a board has taken on, in progress or delivered", () => {
    const ideas = listIdeas(parseIdeasQuery({}), "progress");
    expect(ideas.map((i) => i.status).sort()).toEqual(["delivered", "in_progress", "in_progress"]);
  });

  it("has no status filter, since both kinds show together", () => {
    expect(parseIdeasQuery({ status: "waiting" }, "progress")).toEqual({ sort: "support" });
  });
});
