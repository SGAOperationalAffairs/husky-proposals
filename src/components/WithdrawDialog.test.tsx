import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithdrawDialog } from "./WithdrawDialog";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof WithdrawDialog>[0]> = {}) {
  const props = {
    board: "GIB" as const,
    open: true,
    busy: false,
    error: null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    returnFocus: createRef<HTMLElement>(),
    ...overrides,
  };
  render(<WithdrawDialog {...props} />);
  return props;
}

describe("withdraw dialog (#128)", () => {
  it("says what happens, in the board's color", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Withdraw this post?" });
    expect(dialog.getAttribute("data-board")).toBe("green");
    expect(dialog.className).toContain("board-accent");
    expect(screen.getByText("It will not be reviewed. You can post a new idea at any time.")).toBeTruthy();
  });

  it("confirms", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw post" }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels with Keep it and on Escape", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalledTimes(2);
  });

  it("shows a failure in an alert, and ignores clicks while busy", () => {
    const props = setup({ busy: true, error: "This post changed while you were editing." });
    expect(screen.getByRole("alert").textContent).toBe("This post changed while you were editing.");
    fireEvent.click(screen.getByRole("button", { name: "Withdrawing" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("does not promise action", () => {
    setup();
    expect(document.body.textContent).not.toMatch(/petition|will be approved|will be built|we will/i);
  });
});
