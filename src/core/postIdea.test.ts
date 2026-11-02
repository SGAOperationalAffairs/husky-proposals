import { describe, expect, it } from "vitest";
import { BOARD_FOR_CATEGORY, CATEGORIES, categoryForBoard, parsePostIdea, similarIdeas } from "./postIdea";

// The post form's rules (#55), shared with the post action (#54) so the form and
// the server check the same thing. Only title, summary, and board are
// required; the rest default to "Not sure" (docs/data-model.md, post form).

const valid = {
  title: "Later dining hours on Sundays",
  summary: "The dining hall closes at 7 on Sundays, after most people finish class.",
  category: "dining",
};

describe("parsePostIdea", () => {
  it("accepts the three required fields and fills the rest with Not sure", () => {
    const result = parsePostIdea(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      title: valid.title,
      category: "dining",
      location: null,
      scale: null,
      costBand: null,
      timeHorizon: null,
      anonymous: false,
    });
  });

  it("requires a title, a summary, and a board", () => {
    const fields = Object.keys(valid) as (keyof typeof valid)[];
    for (const field of fields) {
      const result = parsePostIdea({ ...valid, [field]: "" });
      expect(result.success, field).toBe(false);
    }
  });

  it("refuses a board that is not one of the five", () => {
    expect(parsePostIdea({ ...valid, category: "parking" }).success).toBe(false);
  });

  it("maps the form's choices to the schema's values", () => {
    const result = parsePostIdea({
      ...valid,
      scale: "large",
      costBand: "from_1k_to_5k",
      timeHorizon: "next_semester",
      anonymous: true,
    });
    expect(result.success && result.data).toMatchObject({
      scale: "large",
      costBand: "from_1k_to_5k",
      timeHorizon: "next_semester",
      anonymous: true,
    });
  });

  it("trims the title and summary before checking them", () => {
    const result = parsePostIdea({ ...valid, title: "   ", summary: "  " });
    expect(result.success).toBe(false);
  });

  it("limits the summary to 140 characters, the length of a poster line", () => {
    expect(parsePostIdea({ ...valid, summary: "x".repeat(141) }).success).toBe(false);
    expect(parsePostIdea({ ...valid, summary: "x".repeat(140) }).success).toBe(true);
  });

  it("keeps the details optional, and stores them apart from the summary", () => {
    const without = parsePostIdea(valid);
    expect(without.success && without.data.details).toBeNull();
    const withDetails = parsePostIdea({ ...valid, details: "Background and what has been tried." });
    expect(withDetails.success && withDetails.data.details).toBe("Background and what has been tried.");
  });

  it("limits the title so a headline stays within three lines on the poster", () => {
    expect(parsePostIdea({ ...valid, title: "x".repeat(121) }).success).toBe(false);
    expect(parsePostIdea({ ...valid, title: "x".repeat(120) }).success).toBe(true);
  });
});

describe("similarIdeas", () => {
  const ideas = [
    { number: 101, title: "Later dining hours on weekends", category: "dining", reviewStatus: "approved" },
    { number: 102, title: "More vegetarian options at dinner", category: "dining", reviewStatus: "approved" },
    {
      number: 103,
      title: "Dining hours for late study nights",
      category: "campus_services",
      reviewStatus: "approved",
    },
    { number: 104, title: "Later dining hours, pending", category: "dining", reviewStatus: "pending" },
  ];

  it("matches on words in the title, within the same board", () => {
    const found = similarIdeas({ title: "Later dining hours", category: "dining" }, ideas);
    expect(found.map((i) => i.number)).toEqual([101]);
  });

  it("ignores short filler words, so 'the' does not match everything", () => {
    expect(similarIdeas({ title: "the and for", category: "dining" }, ideas)).toEqual([]);
  });

  it("shows only approved ideas, never pending or declined ones", () => {
    const found = similarIdeas({ title: "Later dining hours", category: "dining" }, ideas);
    expect(found.some((i) => i.number === 104)).toBe(false);
  });

  it("returns nothing for an empty title", () => {
    expect(similarIdeas({ title: "", category: "dining" }, ideas)).toEqual([]);
  });

  it("caps the list so the form stays short", () => {
    const many = Array.from({ length: 20 }, (_, n) => ({
      number: n,
      title: `Dining idea ${n}`,
      category: "dining",
      reviewStatus: "approved",
    }));
    expect(similarIdeas({ title: "dining idea", category: "dining" }, many).length).toBe(3);
  });
});

describe("BOARD_FOR_CATEGORY", () => {
  it("maps every category to one of the five boards, with no gaps", () => {
    expect(Object.keys(BOARD_FOR_CATEGORY).sort()).toEqual([...CATEGORIES].sort());
    expect(new Set(Object.values(BOARD_FOR_CATEGORY)).size).toBe(5);
  });
});

describe("categoryForBoard", () => {
  it("goes back from a board to its category", () => {
    expect(categoryForBoard("DAB")).toBe("dining");
    expect(categoryForBoard("SC")).toBe("sustainability");
  });
});
