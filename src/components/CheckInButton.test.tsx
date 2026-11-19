import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckInButton } from "./CheckInButton";

afterEach(cleanup);

describe("CheckInButton (#131)", () => {
  it("offers the check-in with a hint, and calls back on a tap", () => {
    const onCheckIn = vi.fn();
    render(<CheckInButton busy={false} error={null} onCheckIn={onCheckIn} />);
    fireEvent.click(screen.getByRole("button", { name: "Still working, no news" }));
    expect(onCheckIn).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Posts a short update students see on this page/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says Posting and disables itself while busy", () => {
    render(<CheckInButton busy={true} error={null} onCheckIn={() => {}} />);
    const button = screen.getByRole("button", { name: "Posting…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("shows a failure in an alert", () => {
    render(<CheckInButton busy={false} error="Try again in a moment." onCheckIn={() => {}} />);
    expect(screen.getByRole("alert").textContent).toBe("Try again in a moment.");
  });
});
