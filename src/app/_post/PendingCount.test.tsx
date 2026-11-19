import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { pendingPostsText } from "@/core/review";
import { PendingCount } from "./PendingCount";

afterEach(cleanup);

describe("PendingCount (#96)", () => {
  it("renders nothing when the count is not known", () => {
    const { container } = render(<PendingCount id="pending" count={null} />);
    expect(container.innerHTML).toBe("");
  });

  it.each([0, 1, 2])("shows the count in muted text at %i pending", (n) => {
    render(<PendingCount id="pending" count={n} />);
    const line = screen.getByText(pendingPostsText(n));
    expect(line.id).toBe("pending");
    expect(line.className).toContain("text-muted");
    expect(line.className).not.toContain("font-semibold");
  });

  it("is bold at the limit", () => {
    render(<PendingCount id="pending" count={3} />);
    const line = screen.getByText(pendingPostsText(3));
    expect(line.className).toContain("font-semibold");
    expect(line.className).not.toContain("text-muted");
  });
});
