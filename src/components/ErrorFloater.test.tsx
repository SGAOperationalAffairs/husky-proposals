import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addReport, formatErrorsForCopy, type ErrorEntry } from "@/core/errorReport";
import { ErrorFloater } from "./ErrorFloater";

const toast = vi.hoisted(() => vi.fn());
vi.mock("./Toast", () => ({ useToast: () => toast }));

afterEach(() => {
  cleanup();
  toast.mockClear();
});

function entriesFor(...reports: Array<[ErrorEntry["source"], string]>): ErrorEntry[] {
  let entries: ErrorEntry[] = [];
  reports.forEach(([source, message], i) => {
    entries = addReport(entries, { source, message }, new Date(Date.UTC(2026, 10, 10, 14, 3, i)));
  });
  return entries;
}

describe("ErrorFloater (#191)", () => {
  it("renders nothing with no entries", () => {
    const { container } = render(
      <ErrorFloater entries={[]} latest="" onDismiss={vi.fn()} onClearAll={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("lists each error with its source and message, and the count", () => {
    const entries = entriesFor(["client", "thrown in the browser"], ["action", "postIdea: down"]);
    render(<ErrorFloater entries={entries} latest="" onDismiss={vi.fn()} onClearAll={vi.fn()} />);
    const panel = screen.getByRole("region", { name: "Errors on this page" });
    expect(panel.textContent).toContain("Shown on dev and preview only.");
    expect(screen.getByText("Browser")).toBeTruthy();
    expect(screen.getByText("Action")).toBeTruthy();
    expect(screen.getByText("thrown in the browser")).toBeTruthy();
    expect(screen.getByText("postIdea: down")).toBeTruthy();
  });

  it("says how many times a repeated error happened", () => {
    const entries = entriesFor(["client", "boom"], ["client", "boom"], ["client", "boom"]);
    render(<ErrorFloater entries={entries} latest="" onDismiss={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("3 times")).toBeTruthy();
  });

  it("announces the latest report in a live region", () => {
    const entries = entriesFor(["client", "boom"]);
    render(
      <ErrorFloater
        entries={entries}
        latest="Error from Browser: boom"
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe("Error from Browser: boom");
  });

  it("dismisses one entry and clears all", () => {
    const entries = entriesFor(["client", "a"], ["client", "b"]);
    const onDismiss = vi.fn();
    const onClearAll = vi.fn();
    render(<ErrorFloater entries={entries} latest="" onDismiss={onDismiss} onClearAll={onClearAll} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss this error" })[0]!);
    expect(onDismiss).toHaveBeenCalledWith(entries[0]!.key);
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });
});

describe("ErrorFloater copy (#247)", () => {
  it("copies every error as text, and confirms it", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const entries = entriesFor(["client", "thrown in the browser"]);
    render(<ErrorFloater entries={entries} latest="" onDismiss={vi.fn()} onClearAll={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy errors" }));
    expect(writeText).toHaveBeenCalledWith(formatErrorsForCopy(entries));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Errors copied." })),
    );
    expect(screen.getByRole("button", { name: "Copy errors" })).toBeTruthy();
  });

  it("a blocked clipboard does not break the panel", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("blocked");
    });
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(
      <ErrorFloater
        entries={entriesFor(["client", "boom"])}
        latest=""
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy errors" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByText("boom")).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });
});
