import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag }));

const { refreshPublicIdea } = await import("./refresh");

describe("refreshing the public ideas (#60)", () => {
  beforeEach(() => updateTag.mockClear());

  it("refreshes the list and the idea's own page", () => {
    refreshPublicIdea(103);
    expect(updateTag.mock.calls).toEqual([["ideas"], ["idea:103"]]);
  });

  it("refreshes only the list when the idea has no number yet", () => {
    refreshPublicIdea(null);
    expect(updateTag.mock.calls).toEqual([["ideas"]]);
  });
});
