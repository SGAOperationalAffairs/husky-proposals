import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAll,
  dismiss,
  enableReports,
  getSnapshot,
  reportActionOutcome,
  reportError,
  subscribe,
} from "./reports";

let disable: (() => void) | undefined;
afterEach(() => {
  disable?.();
  disable = undefined;
});

describe("error reports store (#191)", () => {
  it("is a no-op until enabled", () => {
    reportError("client", new Error("boom"));
    expect(getSnapshot().entries).toEqual([]);
  });

  it("collects reports once enabled, collapsing repeats", () => {
    disable = enableReports();
    reportError("client", new Error("boom"));
    reportError("client", new Error("boom"));
    const { entries, latest } = getSnapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ source: "client", message: "boom", count: 2 });
    expect(latest).toContain("Error from Browser: boom");
  });

  it("changes the announcement on a repeat, so it is announced again", () => {
    disable = enableReports();
    reportError("client", "boom");
    const first = getSnapshot();
    reportError("client", "boom");
    expect(getSnapshot()).not.toBe(first);
    expect(getSnapshot().latest).not.toBe(first.latest);
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    disable = enableReports();
    const listener = vi.fn();
    const off = subscribe(listener);
    reportError("route", "bad");
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    reportError("route", "worse");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reports an unexpected action result and ignores everything else", () => {
    disable = enableReports();
    reportActionOutcome({ ok: true });
    reportActionOutcome({ ok: false, error: { code: "signed_out" } });
    reportActionOutcome({ ok: false, error: { code: "unexpected" } });
    expect(getSnapshot().entries).toEqual([]);
    reportActionOutcome({ ok: false, error: { code: "unexpected", report: { message: "postIdea: down" } } });
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "postIdea: down" });
  });

  it("dismisses one entry and clears all", () => {
    disable = enableReports();
    reportError("client", "a");
    reportError("client", "b");
    dismiss(getSnapshot().entries[0]!.key);
    expect(getSnapshot().entries.map((e) => e.message)).toEqual(["a"]);
    clearAll();
    expect(getSnapshot().entries).toEqual([]);
  });

  it("forgets everything when disabled", () => {
    const off = enableReports();
    reportError("client", "a");
    off();
    expect(getSnapshot().entries).toEqual([]);
  });
});
