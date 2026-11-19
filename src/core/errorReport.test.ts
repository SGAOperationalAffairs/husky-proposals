import { describe, expect, it } from "vitest";
import {
  addReport,
  dismissEntry,
  formatErrorsForCopy,
  MAX_ENTRIES,
  normalizeError,
  showsErrors,
  type ErrorEntry,
} from "./errorReport";

const at = (seconds: number) => new Date(Date.UTC(2026, 10, 10, 14, 3, seconds));

describe("error report core (#191)", () => {
  describe("addReport", () => {
    it("collapses the same source and message into a count and moves it to the top", () => {
      let entries: ErrorEntry[] = [];
      entries = addReport(entries, { source: "client", message: "boom" }, at(1));
      entries = addReport(entries, { source: "action", message: "other" }, at(2));
      entries = addReport(entries, { source: "client", message: "boom" }, at(3));
      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({ source: "client", message: "boom", count: 2 });
      expect(entries[0]?.firstAt).toBe(at(1).toISOString());
      expect(entries[0]?.lastAt).toBe(at(3).toISOString());
    });

    it("keeps a different source with the same message separate", () => {
      let entries: ErrorEntry[] = [];
      entries = addReport(entries, { source: "client", message: "boom" }, at(1));
      entries = addReport(entries, { source: "route", message: "boom" }, at(2));
      expect(entries).toHaveLength(2);
      expect(entries.every((entry) => entry.count === 1)).toBe(true);
    });

    it("does not change the list it was given", () => {
      const before: ErrorEntry[] = [];
      addReport(before, { source: "client", message: "boom" }, at(1));
      expect(before).toEqual([]);
    });

    it(`keeps at most ${MAX_ENTRIES}, dropping the least recently seen`, () => {
      let entries: ErrorEntry[] = [];
      for (let i = 0; i < MAX_ENTRIES + 1; i++) {
        entries = addReport(entries, { source: "client", message: `error ${i}` }, at(i));
      }
      expect(entries).toHaveLength(MAX_ENTRIES);
      expect(entries[0]?.message).toBe(`error ${MAX_ENTRIES}`);
      expect(entries.some((entry) => entry.message === "error 0")).toBe(false);
    });

    it("a repeat counts as recently seen, so it survives the cap", () => {
      let entries: ErrorEntry[] = [];
      for (let i = 0; i < MAX_ENTRIES; i++) {
        entries = addReport(entries, { source: "client", message: `error ${i}` }, at(i));
      }
      entries = addReport(entries, { source: "client", message: "error 0" }, at(30));
      entries = addReport(entries, { source: "client", message: "new" }, at(31));
      expect(entries.some((entry) => entry.message === "error 0")).toBe(true);
      expect(entries.some((entry) => entry.message === "error 1")).toBe(false);
    });
  });

  describe("dismissEntry", () => {
    it("removes one entry by key", () => {
      let entries: ErrorEntry[] = [];
      entries = addReport(entries, { source: "client", message: "a" }, at(1));
      entries = addReport(entries, { source: "client", message: "b" }, at(2));
      const key = entries[1]!.key;
      expect(dismissEntry(entries, key).map((entry) => entry.message)).toEqual(["b"]);
    });
  });

  describe("normalizeError", () => {
    it("uses an Error's message", () => {
      expect(normalizeError(new Error("nope"))).toBe("nope");
    });

    it("adds the digest of a server error", () => {
      const error = Object.assign(new Error("An error occurred"), { digest: "abc123" });
      expect(normalizeError(error)).toBe("An error occurred (digest abc123)");
    });

    it("keeps a string as is", () => {
      expect(normalizeError("plain text")).toBe("plain text");
    });

    it("stringifies an object", () => {
      expect(normalizeError({ code: 7 })).toBe('{"code":7}');
    });

    it("falls back to String() for a circular object", () => {
      const loop: Record<string, unknown> = {};
      loop.self = loop;
      expect(normalizeError(loop)).toBe("[object Object]");
    });

    it("says Unknown error for empty input", () => {
      expect(normalizeError("   ")).toBe("Unknown error");
      expect(normalizeError(new Error(""))).toBe("Unknown error");
      expect(normalizeError(undefined)).toBe("Unknown error");
    });

    it("caps a long message at 500 characters with an ellipsis", () => {
      const result = normalizeError("x".repeat(900));
      expect(result).toHaveLength(500);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("showsErrors", () => {
    it.each([
      ["dev", true],
      ["preview", true],
      ["test", true],
      ["local", false],
      ["production", false],
    ])("APP_ENV %s gives %s", (appEnv, expected) => {
      expect(showsErrors(appEnv)).toBe(expected);
    });
  });
});

describe("formatErrorsForCopy (#247)", () => {
  it("writes one line per error, in order: time, source, repeat count, message", () => {
    const entries = [
      {
        key: "a",
        source: "client" as const,
        message: "thrown in the browser",
        count: 1,
        firstAt: "2026-11-10T14:03:00.000Z",
        lastAt: "2026-11-10T14:03:00.000Z",
      },
      {
        key: "b",
        source: "action" as const,
        message: "postIdea: down",
        count: 3,
        firstAt: "2026-11-10T14:04:00.000Z",
        lastAt: "2026-11-10T14:05:00.000Z",
      },
    ];
    expect(formatErrorsForCopy(entries)).toBe(
      "2026-11-10T14:03:00.000Z Browser: thrown in the browser\n2026-11-10T14:05:00.000Z Action (3 times): postIdea: down",
    );
  });

  it("indents the continuation lines of a multi-line message", () => {
    const entries = [
      {
        key: "a",
        source: "client" as const,
        message: "Error: boom\n    at run (a.ts:1)\r\n    at main (b.ts:2)",
        count: 1,
        firstAt: "2026-11-10T14:03:00.000Z",
        lastAt: "2026-11-10T14:03:00.000Z",
      },
      {
        key: "b",
        source: "action" as const,
        message: "next",
        count: 1,
        firstAt: "2026-11-10T14:04:00.000Z",
        lastAt: "2026-11-10T14:04:00.000Z",
      },
    ];
    expect(formatErrorsForCopy(entries).split("\n")).toEqual([
      "2026-11-10T14:03:00.000Z Browser: Error: boom",
      "      at run (a.ts:1)",
      "      at main (b.ts:2)",
      "2026-11-10T14:04:00.000Z Action: next",
    ]);
  });

  it("is empty when there is nothing to copy", () => {
    expect(formatErrorsForCopy([])).toBe("");
  });
});
