import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TakeDownDialog } from "./TakeDownDialog";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof TakeDownDialog>[0]> = {}) {
  const props = {
    number: 157,
    board: "DAB" as const,
    open: true,
    busy: false,
    error: null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    returnFocus: createRef<HTMLElement>(),
    ...overrides,
  };
  render(<TakeDownDialog {...props} />);
  return props;
}

describe("take-down dialog (#59)", () => {
  it("names the idea and says what happens", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Take down #157?" })).toBeTruthy();
    expect(screen.getByText(/It stops being public right away/)).toBeTruthy();
  });

  it("refuses an empty reason", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Take down" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Write a reason so the student knows what to change.")).toBeTruthy();
  });

  it("confirms with the reason", () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText("Reason the student will see"), {
      target: { value: "It names a person." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Take down" }));
    expect(props.onConfirm).toHaveBeenCalledWith("It names a person.");
  });

  it("cancels on Escape", () => {
    const props = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalled();
  });

  it("shows a failure in an alert and ignores clicks while busy", () => {
    const props = setup({ busy: true, error: { text: "This idea is no longer approved." } });
    expect(screen.getByRole("alert").textContent).toBe("This idea is no longer approved.");
    fireEvent.change(screen.getByLabelText("Reason the student will see"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Taking down…" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
