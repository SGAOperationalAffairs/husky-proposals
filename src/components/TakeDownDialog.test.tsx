import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TakeDownDialog } from "./TakeDownDialog";

afterEach(cleanup);

function setup(overrides: Partial<Parameters<typeof TakeDownDialog>[0]> = {}) {
  const props = {
    kind: "take_down" as const,
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

const LONG_REASON = "Add the cost and the place, then send it again.";

describe("take-down dialog (#59, #286)", () => {
  it("names the idea and says it is final", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Take down #157?" })).toBeTruthy();
    expect(screen.getByText(/It comes off the ideas list for good/)).toBeTruthy();
    expect(screen.getByText(/use Send back instead/)).toBeTruthy();
  });

  it("refuses an empty reason with the take-down wording", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Take down" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Write a reason so the student knows why it came down.")).toBeTruthy();
  });

  it("confirms a short reason, since take-down keeps the looser rule", () => {
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

describe("send-back dialog (#286)", () => {
  it("names the idea and says the student can fix it and send it again", () => {
    setup({ kind: "send_back" });
    expect(screen.getByRole("dialog", { name: "Send #157 back to the student?" })).toBeTruthy();
    expect(screen.getByText(/can edit the post, and can send it for review again/)).toBeTruthy();
    expect(screen.getByText(/it keeps #157/)).toBeTruthy();
    expect(screen.getByText("At least 40 characters.")).toBeTruthy();
  });

  it("refuses an empty reason with the usual wording", () => {
    const props = setup({ kind: "send_back" });
    fireEvent.click(screen.getByRole("button", { name: "Send back" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Write a reason so the student knows what to change.")).toBeTruthy();
  });

  it("refuses a reason under 40 characters", () => {
    const props = setup({ kind: "send_back" });
    fireEvent.change(screen.getByLabelText("What the student should change"), {
      target: { value: "Too short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send back" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText("Write at least 40 characters so the student knows what to change."),
    ).toBeTruthy();
  });

  it("confirms with a full reason", () => {
    const props = setup({ kind: "send_back" });
    fireEvent.change(screen.getByLabelText("What the student should change"), {
      target: { value: LONG_REASON },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send back" }));
    expect(props.onConfirm).toHaveBeenCalledWith(LONG_REASON);
  });

  it("says Sending back while busy and ignores clicks", () => {
    const props = setup({ kind: "send_back", busy: true });
    fireEvent.change(screen.getByLabelText("What the student should change"), {
      target: { value: LONG_REASON },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sending back…" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
