import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusActions } from "./StatusActions";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof StatusActions>[0]> = {}) {
  const props = {
    status: "collecting_support" as const,
    waitingReason: null,
    closedReason: null,
    board: "DAB" as const,
    busy: null,
    error: null,
    headsUp: null,
    onStart: vi.fn(),
    onReopen: vi.fn(),
    onConfirmHeadsUp: vi.fn(),
    onDismissHeadsUp: vi.fn(),
    onHold: vi.fn(),
    onFinish: vi.fn(),
    ...overrides,
  };
  render(<StatusActions {...props} />);
  return props;
}

const buttons = () => screen.queryAllByRole("button").map((button) => button.textContent);

describe("status actions in the leader panel (#98, #126)", () => {
  it("collecting support offers only Start, full width", () => {
    const props = setup();
    expect(buttons()).toEqual(["Start"]);
    const start = screen.getByRole("button", { name: "Start" });
    expect(start.className).toContain("w-full");
    fireEvent.click(start);
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it("on hold shows what students see, and offers only Start", () => {
    setup({ status: "waiting", waitingReason: "It overlaps with another idea" });
    expect(screen.getByText("Students see: “It overlaps with another idea.”")).toBeTruthy();
    expect(buttons()).toEqual(["Start"]);
  });

  it("in progress offers Finish, then Hold", () => {
    const props = setup({ status: "in_progress" });
    expect(buttons()).toEqual(["Finish", "Hold"]);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(props.onFinish).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Hold" }));
    expect(props.onHold).toHaveBeenCalledTimes(1);
  });

  it("delivered offers Reopen", () => {
    const props = setup({ status: "delivered" });
    expect(screen.getByText("Delivered. Reopen it if work picks back up.")).toBeTruthy();
    expect(buttons()).toEqual(["Reopen"]);
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(props.onReopen).toHaveBeenCalledTimes(1);
  });

  it("closed shows the reason students see and offers Reopen (#237)", () => {
    const props = setup({ status: "closed", closedReason: "Facilities is not adding new outdoor power" });
    expect(
      screen.getByText("Closed. Students see: “Facilities is not adding new outdoor power.”"),
    ).toBeTruthy();
    expect(buttons()).toEqual(["Reopen"]);
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(props.onReopen).toHaveBeenCalledTimes(1);
  });

  it("while starting, the button reads Starting and ignores clicks", () => {
    const props = setup({ busy: "start" });
    fireEvent.click(screen.getByRole("button", { name: "Starting…" }));
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it("while reopening, the button reads Reopening and ignores clicks", () => {
    const props = setup({ status: "delivered", busy: "reopen" });
    fireEvent.click(screen.getByRole("button", { name: "Reopening…" }));
    expect(props.onReopen).not.toHaveBeenCalled();
  });

  it("shows a failure in an alert", () => {
    setup({ error: { text: "This idea is no longer public." } });
    expect(screen.getByRole("alert").textContent).toBe("This idea is no longer public.");
  });

  describe("heads-up", () => {
    it("replaces the buttons and takes focus", () => {
      const props = setup({ headsUp: { for: "start", inProgress: 2, guideline: 2 } });
      const text = screen.getByText("The Dining Advisory Board is already working on 2 ideas.");
      expect(document.activeElement).toBe(text);
      expect(
        screen.getByText(
          "Boards usually work on 1 to 2 ideas at a time, and a large idea counts as 2. Start this one anyway?",
        ),
      ).toBeTruthy();
      expect(buttons()).toEqual(["Start anyway", "Not now"]);
      fireEvent.click(screen.getByRole("button", { name: "Start anyway" }));
      expect(props.onConfirmHeadsUp).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(props.onDismissHeadsUp).toHaveBeenCalledTimes(1);
    });

    it("for a reopen, ends in Reopen this one anyway and confirms with Reopen anyway (#126)", () => {
      const props = setup({
        status: "delivered",
        headsUp: { for: "reopen", inProgress: 2, guideline: 2 },
      });
      expect(screen.getByText(/Reopen this one anyway\?$/)).toBeTruthy();
      expect(buttons()).toEqual(["Reopen anyway", "Not now"]);
      fireEvent.click(screen.getByRole("button", { name: "Reopen anyway" }));
      expect(props.onConfirmHeadsUp).toHaveBeenCalledTimes(1);
    });

    it("reads in the singular for one idea and a guideline of 1", () => {
      setup({ headsUp: { for: "start", inProgress: 1, guideline: 1 } });
      expect(screen.getByText("The Dining Advisory Board is already working on 1 idea.")).toBeTruthy();
      expect(screen.getByText(/usually work on 1 idea at a time/)).toBeTruthy();
    });

    it("names a large idea when nothing else is in progress", () => {
      setup({ headsUp: { for: "start", inProgress: 0, guideline: 1 } });
      expect(screen.getByText("This is a large idea, so it counts as 2.")).toBeTruthy();
      expect(
        screen.getByText("Boards usually work on 1 idea at a time. Start this one anyway?"),
      ).toBeTruthy();
    });

    it("never promises, uses the word slots, or an em dash", () => {
      setup({ headsUp: { for: "start", inProgress: 2, guideline: 2 } });
      expect(document.body.textContent).not.toMatch(/slots|petition|—/i);
    });
  });
});
