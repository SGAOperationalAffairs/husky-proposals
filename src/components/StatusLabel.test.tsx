import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusLabel } from "./StatusLabel";

afterEach(cleanup);

// One status chip for the site, the queue, and the ideas list (#151).
describe("status label (#151)", () => {
  it("uses the site's words and colors for an idea status", () => {
    render(<StatusLabel status="in_progress" />);
    const chip = screen.getByText("In progress");
    expect(chip.classList.contains("bg-amber")).toBe(true);
    expect(chip.classList.contains("text-amber-ink")).toBe(true);
  });

  it("gives a queue post awaiting review its own outlined look", () => {
    render(<StatusLabel status="pending" />);
    const chip = screen.getByText("Pending review");
    expect(chip.classList.contains("bordered")).toBe(true);
    expect(chip.classList.contains("bg-amber")).toBe(false);
  });
});
