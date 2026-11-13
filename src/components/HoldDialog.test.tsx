import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HOLD_REASONS } from "@/core/ideaStatus";
import { HoldDialog } from "./HoldDialog";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof HoldDialog>[0]> = {}) {
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
  render(<HoldDialog {...props} />);
  return props;
}

const select = () => screen.getByLabelText("Reason students will see");

describe("hold dialog (#98)", () => {
  it("names the idea and says what students keep and see", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Put #103 on hold?" })).toBeTruthy();
    expect(
      screen.getByText("It stays on the list and keeps its support. Students see the reason you pick."),
    ).toBeTruthy();
  });

  it("offers every preset reason and Something else", () => {
    setup();
    const options = Array.from(select().querySelectorAll("option")).map((o) => o.textContent);
    for (const reason of HOLD_REASONS) expect(options).toContain(reason);
    expect(options).toContain("Something else");
  });

  it("refuses to confirm with no reason", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Put on hold" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Pick a reason students will see.")).toBeTruthy();
  });

  it("confirms with a preset reason", () => {
    const props = setup();
    fireEvent.change(select(), { target: { value: HOLD_REASONS[1] } });
    fireEvent.click(screen.getByRole("button", { name: "Put on hold" }));
    expect(props.onConfirm).toHaveBeenCalledWith(HOLD_REASONS[1]);
  });

  it("shows the free text field only for Something else", () => {
    setup();
    expect(screen.queryByLabelText("Write the reason")).toBeNull();
    fireEvent.change(select(), { target: { value: HOLD_REASONS[0] } });
    expect(screen.queryByLabelText("Write the reason")).toBeNull();
    fireEvent.change(select(), { target: { value: "other" } });
    expect(screen.getByLabelText("Write the reason")).toBeTruthy();
    expect(
      screen.getByText(
        "Students see this. Keep it general, and leave out confidential talks with administration.",
      ),
    ).toBeTruthy();
  });

  it("needs text once Something else is picked, then confirms with it", () => {
    const props = setup();
    fireEvent.change(select(), { target: { value: "other" } });
    fireEvent.click(screen.getByRole("button", { name: "Put on hold" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Write the reason students will see.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Write the reason"), { target: { value: "Waiting on a budget" } });
    fireEvent.click(screen.getByRole("button", { name: "Put on hold" }));
    expect(props.onConfirm).toHaveBeenCalledWith("Waiting on a budget");
  });

  it("cancels on Escape", () => {
    const props = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalled();
  });

  it("shows a failure in an alert and ignores clicks while busy", () => {
    const props = setup({ busy: true, error: { text: "This idea is no longer public." } });
    expect(screen.getByRole("alert").textContent).toBe("This idea is no longer public.");
    fireEvent.change(select(), { target: { value: HOLD_REASONS[0] } });
    fireEvent.click(screen.getByRole("button", { name: "Putting on hold…" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
