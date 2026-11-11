// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearDraft, loadDraft, saveDraft, type PostDraft } from "./draft";

const DRAFT: PostDraft = {
  title: "Later dining hours",
  summary: "Open until midnight.",
  details: "",
  category: "dining",
  location: "",
  scale: "",
  costBand: "",
  timeHorizon: "",
  anonymous: true,
};

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("post draft (#181)", () => {
  it("round trips", () => {
    saveDraft(DRAFT);
    expect(loadDraft()).toEqual(DRAFT);
  });

  it("returns null when nothing is stored", () => {
    expect(loadDraft()).toBeNull();
  });

  it("returns null for bad JSON", () => {
    sessionStorage.setItem("husky-proposals:post-draft", "{nope");
    expect(loadDraft()).toBeNull();
  });

  it("returns null for the wrong shape", () => {
    sessionStorage.setItem("husky-proposals:post-draft", JSON.stringify({ title: 5 }));
    expect(loadDraft()).toBeNull();
  });

  it("clears", () => {
    saveDraft(DRAFT);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("stays quiet when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveDraft(DRAFT)).not.toThrow();
    expect(loadDraft()).toBeNull();
    expect(() => clearDraft()).not.toThrow();
  });
});
