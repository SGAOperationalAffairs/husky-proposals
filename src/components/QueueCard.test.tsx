import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { QueueItem } from "@/core/queue";
import { QueueCard } from "@/app/queue/QueueCard";

afterEach(cleanup);

// A queue item as a poster (#139): no buttons, and the status line says what the item is.
const post: QueueItem = {
  kind: "post",
  number: 201,
  title: "A study space in the library",
  boardId: "CPAB",
  status: "pending",
  supportCount: 0,
  updatedDaysAgo: 1,
  description: "Quiet rooms open late during finals.",
};

describe("queue card (#139)", () => {
  it("shows the board and number, the title, the description, and Pending review", () => {
    render(<QueueCard item={post} />);
    expect(screen.getByText("Campus Planning #201")).toBeTruthy();
    expect(screen.getByText("Pending review")).toBeTruthy();
    expect(screen.getByText("Quiet rooms open late during finals.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "A study space in the library" }).getAttribute("href")).toBe(
      "/queue/review/201",
    );
  });

  it("has no support or participate buttons", () => {
    render(<QueueCard item={post} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

// Support only applies to approved ideas, so a pending post shows no support count (#139).
describe("queue card support line", () => {
  it("shows Not approved yet, not a support count, for a pending post", () => {
    render(<QueueCard item={{ ...post, supportCount: 3 }} />);
    expect(screen.getByText("Not approved yet")).toBeTruthy();
    expect(screen.queryByText(/supported/)).toBeNull();
  });
});
