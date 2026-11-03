import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BOARDS } from "@/core/boards";
import { BoardChip } from "./BoardChip";

afterEach(cleanup);

// The solid board chip for rows (#151): the board's name, in its own color.
describe("board chip (#151)", () => {
  it("shows the board's name and sets the board's color on the chip", () => {
    render(<BoardChip board="DAB" />);
    const chip = screen.getByText(BOARDS.DAB.category);
    expect(chip.getAttribute("data-board")).toBe(BOARDS.DAB.color);
    expect(chip.getAttribute("style")).toContain("var(--b)");
  });

  it("swaps the colors when the row already has the board's color behind it", () => {
    render(<BoardChip board="DAB" inverse />);
    const chip = screen.getByText(BOARDS.DAB.category);
    expect(chip.getAttribute("style")).toContain("var(--on-b)");
  });
});
