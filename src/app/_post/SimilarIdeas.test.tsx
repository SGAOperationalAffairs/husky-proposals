import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SimilarIdeas } from "./SimilarIdeas";
import type { SimilarIdeaData } from "./present";

afterEach(cleanup);

// The "similar ideas already posted" block under the Title field (#55).
const IDEAS: SimilarIdeaData[] = [
  { number: 101, title: "Later dining hours on weekends", category: "dining", status: "collecting_support" },
  { number: 102, title: "Dining hours for study nights", category: "dining", status: "in_progress" },
  { number: 103, title: "Dining hours near the library", category: "dining", status: "waiting" },
  { number: 104, title: "Dining hours at the gym", category: "dining", status: "delivered" },
  { number: 105, title: "Dining hours on the quad", category: "campus_services", status: "in_progress" },
];

const live = (container: HTMLElement) => container.querySelector('[aria-live="polite"]');

describe("SimilarIdeas (#55)", () => {
  it("shows a link and the status for each match, to a new tab", () => {
    render(<SimilarIdeas title="Later dining hours" category="dining" ideas={IDEAS.slice(0, 1)} />);
    expect(screen.getByText("Similar ideas already posted")).toBeTruthy();
    const link = screen.getByRole("link", { name: /#101 Later dining hours on weekends/ });
    expect(link.getAttribute("href")).toBe("/ideas/101");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.textContent).toContain("(opens in a new tab)");
    expect(screen.getByText("Collecting support")).toBeTruthy();
    expect(
      screen.getByText(
        "You can still post yours. If one of these is the same idea, you can support it instead. Links open in a new tab.",
      ),
    ).toBeTruthy();
  });

  it("shows at most three, and only for the picked board", () => {
    render(<SimilarIdeas title="dining hours" category="dining" ideas={IDEAS} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.queryByText(/#105/)).toBeNull();
  });

  it("announces the count in a polite live line", () => {
    const { container, rerender } = render(
      <SimilarIdeas title="Later dining hours" category="dining" ideas={IDEAS} />,
    );
    expect(live(container)?.textContent).toBe("3 similar ideas already posted.");
    rerender(<SimilarIdeas title="weekends" category="dining" ideas={IDEAS} />);
    expect(live(container)?.textContent).toBe("1 similar idea already posted.");
  });

  it("renders no block and an empty live line for an empty title or only stop words", () => {
    const { container, rerender } = render(<SimilarIdeas title="" category="dining" ideas={IDEAS} />);
    expect(screen.queryByText("Similar ideas already posted")).toBeNull();
    expect(live(container)?.textContent).toBe("");
    rerender(<SimilarIdeas title="the and for" category="dining" ideas={IDEAS} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(live(container)?.textContent).toBe("");
  });

  it("matches again for a new board", () => {
    const { rerender } = render(<SimilarIdeas title="dining hours" category="dining" ideas={IDEAS} />);
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
    rerender(<SimilarIdeas title="dining hours" category="green_initiatives" ideas={IDEAS} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps the block itself out of the live region and off a white panel", () => {
    render(<SimilarIdeas title="Later dining hours" category="dining" ideas={IDEAS} />);
    const block = screen.getByText("Similar ideas already posted").parentElement!;
    expect(block.getAttribute("aria-live")).toBeNull();
    expect(block.className).toContain("bordered");
    expect(block.className).not.toContain("bg-surface");
  });
});
