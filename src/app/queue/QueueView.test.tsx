import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { QueueItem } from "@/core/queue";
import { QueueView } from "./QueueView";

afterEach(cleanup);

// The queue's counts and filters (#124). Items here are already limited to what the
// viewer may see (queueFor, tested in src/core/queue.test.ts).
const items: QueueItem[] = [
  {
    kind: "post",
    number: 201,
    title: "A study space",
    boardId: "CPAB",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 1,
  },
  {
    kind: "post",
    number: 202,
    title: "A bike stand",
    boardId: "GIB",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 3,
  },
  {
    kind: "idea",
    number: 103,
    title: "A food pantry",
    boardId: "DAB",
    status: "in_progress",
    supportCount: 412,
    updatedDaysAgo: 2,
  },
];
const boards = [
  { value: "CPAB" as const, label: "Campus Planning" },
  { value: "GIB" as const, label: "Green Initiatives" },
  { value: "DAB" as const, label: "Dining" },
];

describe("the queue's red count (#124)", () => {
  it("shows the number of pending posts on the To review tab", () => {
    render(<QueueView items={items} boards={boards} />);
    expect(
      within(screen.getByRole("tab", { name: /To review/ })).getByLabelText("2 need attention"),
    ).toBeTruthy();
  });

  it("shows no badge when nothing is pending", () => {
    render(<QueueView items={items.filter((i) => i.kind === "idea")} boards={boards} />);
    expect(screen.queryByLabelText(/need attention/)).toBeNull();
  });

  it("never shows a badge on the Ideas tab", () => {
    render(<QueueView items={items} boards={boards} />);
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(within(screen.getByRole("tab", { name: "Ideas" })).queryByLabelText(/need attention/)).toBeNull();
  });
});

describe("the queue's list and filters (#124)", () => {
  it("lists only pending posts on the To review tab", () => {
    render(<QueueView items={items} boards={boards} />);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["A study space", "A bike stand"]);
  });

  it("filters the list by board", () => {
    render(<QueueView items={items} boards={boards} />);
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "GIB" } });
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["A bike stand"]);
  });

  it("filters ideas by status on the Ideas tab", () => {
    render(<QueueView items={items} boards={boards} />);
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["A food pantry"]);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "waiting" } });
    expect(screen.getByText("No ideas match these filters.")).toBeTruthy();
  });

  it("says what to do when nothing is pending", () => {
    render(<QueueView items={[]} boards={[]} />);
    expect(screen.getByText("Nothing to review right now. New posts appear here.")).toBeTruthy();
  });
});
