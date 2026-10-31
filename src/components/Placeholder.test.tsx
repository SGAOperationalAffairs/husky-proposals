import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IdeaPlaceholder, WallPlaceholder } from "./Placeholder";

afterEach(cleanup);

describe.each([
  ["wall", WallPlaceholder, "Loading ideas"],
  ["idea", IdeaPlaceholder, "Loading the idea"],
] as const)("%s placeholder (#73)", (_, Placeholder, label) => {
  it("marks the region busy and hides the shapes from screen readers", () => {
    const { container } = render(<Placeholder />);
    const region = container.firstElementChild!;
    expect(region.getAttribute("aria-busy")).toBe("true");
    // Screen readers hear one short line, then the content when it arrives.
    expect(screen.getByText(label).classList.contains("sr-only")).toBe(true);
    const shapes = region.querySelector("[aria-hidden='true']");
    expect(shapes).toBeTruthy();
    expect(shapes!.textContent).not.toBe("");
  });
});
