import { describe, expect, it } from "vitest";
import { safeNextPath } from "./nextPath";

describe("safeNextPath (#93)", () => {
  it("keeps same-site relative paths, with query and hash", () => {
    expect(safeNextPath("/post")).toBe("/post");
    expect(safeNextPath("/ideas/103?x=1#a")).toBe("/ideas/103?x=1#a");
    expect(safeNextPath("/")).toBe("/");
  });

  it.each([
    ["a protocol-relative URL", "//evil.com"],
    ["a backslash host", "/\\evil.com"],
    ["an absolute URL", "https://evil.com"],
    ["a javascript URL", "javascript:alert(1)"],
    ["a path with no leading slash", "post"],
    ["an empty string", ""],
    ["a control character", "/post\n/x"],
    ["a tab smuggled in", "/\t/evil.com"],
    ["a path over 2048 characters", "/" + "a".repeat(2048)],
  ])("rejects %s", (_name, raw) => {
    expect(safeNextPath(raw)).toBeNull();
  });

  it("rejects null and undefined", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });

  it.each(["/sign-in", "/sign-in?next=/post", "/sign-in/x", "/stand-in", "/stand-in/x?next=/post"])(
    "rejects %s so sign-in never loops back to itself",
    (raw) => {
      expect(safeNextPath(raw)).toBeNull();
    },
  );

  it("does not treat a similarly named page as a sign-in page", () => {
    expect(safeNextPath("/sign-in-help")).toBe("/sign-in-help");
  });
});
