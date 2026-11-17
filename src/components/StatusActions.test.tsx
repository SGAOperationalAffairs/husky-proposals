import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusActions } from "./StatusActions";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof StatusActions>[0]> = {}) {
  const props = {
    status: "collecting_support" as const,
    waitingReason: null,
    board: "DAB" as const,
    busy: null,
    error: null,
    headsUp: null,
    onStart: vi.fn(),
    onStartAnyway: vi.fn(),
    onDismissHeadsUp: vi.fn(),
    onHold: vi.fn(),
    onDeliver: vi.fn(),
    ...overrides,
  };
  render(<StatusActions {...props} />);
  return props;
}

describe("status actions in the leader panel (#98)", () => {
  it("collecting support offers start and hold", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Start working on this" }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Put on hold" }));
    expect(props.onHold).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Mark delivered" })).toBeNull();
  });

  it("on hold shows what students see, and offers only start", () => {
    setup({ status: "waiting", waitingReason: "It overlaps with another idea" });
    expect(screen.getByText("Students see: “It overlaps with another idea.”")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start working on this" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Put on hold" })).toBeNull();
  });

  it("in progress offers only Mark delivered", () => {
    const props = setup({ status: "in_progress" });
    fireEvent.click(screen.getByRole("button", { name: "Mark delivered" }));
    expect(props.onDeliver).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Start working on this" })).toBeNull();
  });

  it("delivered has no buttons and says it stays on record", () => {
    setup({ status: "delivered" });
    expect(screen.getByText("Delivered. It stays on record.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("while starting, the button reads Starting and ignores clicks", () => {
    const props = setup({ busy: "start" });
    fireEvent.click(screen.getByRole("button", { name: "Starting…" }));
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it("shows a failure in an alert", () => {
    setup({ error: { text: "This idea is no longer public." } });
    expect(screen.getByRole("alert").textContent).toBe("This idea is no longer public.");
  });

  describe("heads-up", () => {
    it("replaces the buttons and takes focus", () => {
      const props = setup({ headsUp: { inProgress: 2, guideline: 2 } });
      const text = screen.getByText("The Dining Advisory Board is already working on 2 ideas.");
      expect(document.activeElement).toBe(text);
      expect(
        screen.getByText(
          "Boards usually work on 1 to 2 ideas at a time, and a large idea counts as 2. Start this one anyway?",
        ),
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Put on hold" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Start anyway" }));
      expect(props.onStartAnyway).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(props.onDismissHeadsUp).toHaveBeenCalledTimes(1);
    });

    it("reads in the singular for one idea and a guideline of 1", () => {
      setup({ headsUp: { inProgress: 1, guideline: 1 } });
      expect(screen.getByText("The Dining Advisory Board is already working on 1 idea.")).toBeTruthy();
      expect(screen.getByText(/usually work on 1 idea at a time/)).toBeTruthy();
    });

    it("names a large idea when nothing else is in progress", () => {
      setup({ headsUp: { inProgress: 0, guideline: 1 } });
      expect(screen.getByText("This is a large idea, so it counts as 2.")).toBeTruthy();
      expect(
        screen.getByText("Boards usually work on 1 idea at a time. Start this one anyway?"),
      ).toBeTruthy();
    });

    it("never promises, uses the word slots, or an em dash", () => {
      setup({ headsUp: { inProgress: 2, guideline: 2 } });
      expect(document.body.textContent).not.toMatch(/slots|petition|—/i);
    });
  });
});
