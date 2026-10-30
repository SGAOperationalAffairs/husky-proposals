import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QueueRow } from "./QueueRow";

afterEach(cleanup);

const row = {
  rank: 1,
  number: 103,
  title: "Food pantry on campus",
  board: "DAB" as const,
  supportCount: 48,
  willingCount: 6,
  ageDays: 4,
  status: "collecting_support" as const,
};

describe("queue row number (#36)", () => {
  it("shows #103, as posters do, and says proposal 103 to screen readers", () => {
    const { container } = render(<QueueRow {...row} />);
    const visible = container.querySelector("[aria-hidden='true'][data-number]");
    expect(visible?.textContent).toBe("#103");
    expect(container.querySelector(".sr-only")?.textContent).toBe("Proposal 103");
    expect(container.textContent).not.toMatch(/Proposal 103,/);
  });
});
