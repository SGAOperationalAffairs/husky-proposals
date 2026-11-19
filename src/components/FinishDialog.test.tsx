import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinishDialog } from "./FinishDialog";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof FinishDialog>[0]> = {}) {
  const props = {
    number: 103,
    board: "DAB" as const,
    open: true,
    busy: null,
    error: null,
    onDeliver: vi.fn(),
    onClose: vi.fn(),
    onCancel: vi.fn(),
    returnFocus: createRef<HTMLElement>(),
    ...overrides,
  };
  render(<FinishDialog {...props} />);
  return props;
}

const radio = (name: string) =>
  screen.getByRole("radio", { name: new RegExp(`^${name}`) }) as HTMLInputElement;

describe("finish dialog (#126)", () => {
  it("names the idea and opens with neither choice selected", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Finish #103" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "How did it end?" })).toBeTruthy();
    expect(radio("Delivered").checked).toBe(false);
    expect(radio("Closed").checked).toBe(false);
    expect(screen.getByRole("button", { name: "Finish" })).toBeTruthy();
    expect(screen.queryByLabelText(/Reason students will see/)).toBeNull();
  });

  it("confirming with no choice shows the choice error and calls nothing", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(screen.getByText("Pick Delivered or Closed.")).toBeTruthy();
    expect(props.onDeliver).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("Delivered confirms with its own label and calls onDeliver", () => {
    const props = setup();
    fireEvent.click(radio("Delivered"));
    fireEvent.click(screen.getByRole("button", { name: "Mark delivered" }));
    expect(props.onDeliver).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("Closed shows the reason field and will not submit without one", () => {
    const props = setup();
    fireEvent.click(radio("Closed"));
    const button = screen.getByRole("button", { name: "Close idea" });
    fireEvent.click(button);
    expect(screen.getByText("Write the reason students will see.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Reason students will see/), { target: { value: "   " } });
    fireEvent.click(button);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("Closed with a reason calls onClose with it trimmed", () => {
    const props = setup();
    fireEvent.click(radio("Closed"));
    fireEvent.change(screen.getByLabelText(/Reason students will see/), {
      target: { value: "  Facilities is not adding new outdoor power  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close idea" }));
    expect(props.onClose).toHaveBeenCalledWith("Facilities is not adding new outdoor power");
    expect(props.onDeliver).not.toHaveBeenCalled();
  });

  it("shows a reason error from the server on the field", () => {
    setup({ error: { text: "Write the reason students will see.", field: "reason" } });
    fireEvent.click(radio("Closed"));
    expect(screen.getByText("Write the reason students will see.")).toBeTruthy();
  });

  it("shows another failure in an alert and ignores clicks while busy", () => {
    const props = setup({ busy: "deliver", error: { text: "This idea is no longer public." } });
    expect(screen.getByRole("alert").textContent).toBe("This idea is no longer public.");
    fireEvent.click(radio("Delivered"));
    fireEvent.click(screen.getByRole("button", { name: "Marking delivered…" }));
    expect(props.onDeliver).not.toHaveBeenCalled();
  });

  it("cancels with the Cancel button and on Escape", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).toHaveBeenCalled();
    expect(props.onDeliver).not.toHaveBeenCalled();
  });

  it("says nothing that promises action", () => {
    setup();
    expect(document.body.textContent).not.toMatch(/petition|slots|—/i);
  });
});
