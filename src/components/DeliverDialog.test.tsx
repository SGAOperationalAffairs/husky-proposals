import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeliverDialog } from "./DeliverDialog";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof DeliverDialog>[0]> = {}) {
  const props = {
    number: 103,
    board: "DAB" as const,
    open: true,
    busy: false,
    error: null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    returnFocus: createRef<HTMLElement>(),
    ...overrides,
  };
  render(<DeliverDialog {...props} />);
  return props;
}

describe("deliver dialog (#98)", () => {
  it("names the idea and says delivered is final", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Mark #103 delivered?" })).toBeTruthy();
    expect(
      screen.getByText("Delivered is final. The idea stays on record and leaves the board's ranking."),
    ).toBeTruthy();
  });

  it("confirms", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Mark delivered" }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels with the Cancel button and on Escape", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("shows a failure in an alert and ignores clicks while busy", () => {
    const props = setup({ busy: true, error: { text: "This idea is no longer public." } });
    expect(screen.getByRole("alert").textContent).toBe("This idea is no longer public.");
    fireEvent.click(screen.getByRole("button", { name: "Marking delivered…" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
