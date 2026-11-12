// Tests for the My ideas grouping (#193). Written first.
import { describe, expect, it } from "vitest";
import { groupMyIdeas, type MyRow } from "./groups";

const row = (overrides: Partial<MyRow> & Pick<MyRow, "number">): MyRow => ({
  title: `Idea ${overrides.number}`,
  board: "DAB",
  status: "collecting_support",
  review: "approved",
  posted: false,
  supported: false,
  participated: false,
  submittedAt: 0,
  description: "",
  supportCount: 0,
  willingCount: 0,
  updatedDaysAgo: 0,
  ...overrides,
});

describe("groupMyIdeas (#193)", () => {
  it("puts a posted idea in Written only, pending or not", () => {
    const groups = groupMyIdeas([row({ number: 1, posted: true, review: "pending" })]);
    expect(groups.written.map((r) => r.number)).toEqual([1]);
    expect(groups.supported).toEqual([]);
    expect(groups.participated).toEqual([]);
  });

  it("puts an idea the student supported in Supported, and one they joined in Participated", () => {
    const groups = groupMyIdeas([
      row({ number: 2, supported: true }),
      row({ number: 3, participated: true }),
    ]);
    expect(groups.supported.map((r) => r.number)).toEqual([2]);
    expect(groups.participated.map((r) => r.number)).toEqual([3]);
    expect(groups.written).toEqual([]);
  });

  it("shows an idea that is both supported and participated in on both tabs", () => {
    const groups = groupMyIdeas([row({ number: 4, supported: true, participated: true })]);
    expect(groups.supported.map((r) => r.number)).toEqual([4]);
    expect(groups.participated.map((r) => r.number)).toEqual([4]);
  });

  it("lists each tab newest first", () => {
    const groups = groupMyIdeas([
      row({ number: 5, supported: true, submittedAt: 100 }),
      row({ number: 6, supported: true, submittedAt: 300 }),
      row({ number: 7, supported: true, submittedAt: 200 }),
    ]);
    expect(groups.supported.map((r) => r.number)).toEqual([6, 7, 5]);
  });

  it("returns empty lists when the student has no rows", () => {
    expect(groupMyIdeas([])).toEqual({ written: [], supported: [], participated: [] });
  });
});
