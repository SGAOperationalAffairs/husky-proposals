import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApprovedRowData, ReviewRowData } from "@/app/_review/present";
import { ToastProvider } from "@/components/Toast";
import type { QueueItem } from "@/core/queue";
import { QueueView } from "./QueueView";

// The review list runs server actions and refreshes the router; neither is under test here.
vi.mock("@/app/_review/actions", () => ({
  approvePost: vi.fn(),
  declinePost: vi.fn(),
  takeDownPost: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

// The queue's counts, lists, and filters (#59, #124). Rows here are already limited to
// what the viewer may see (reviewQueue and queueFor, tested beside them).
function pendingRow(id: string, title: string, boardId: ReviewRowData["boardId"]): ReviewRowData {
  return {
    id,
    title,
    description: `About ${title}.`,
    paragraphs: [],
    boardId,
    facts: [{ term: "Scale", value: "Small" }],
    sentText: "Sent 2 days ago",
    due: { text: "Due in 1 day", overdue: false },
    isAnonymous: false,
    poster: { kind: "named", name: "Maya Test", email: "maya.test@example.com" },
  };
}
const pending = [pendingRow("a", "A study space", "CPAB"), pendingRow("b", "A bike stand", "GIB")];
const approved: ApprovedRowData[] = [
  { id: "c", number: 157, title: "A food pantry", boardId: "DAB", approvedText: "Approved 3 days ago" },
];
const ideas: QueueItem[] = [
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

function view(
  review: { pending: ReviewRowData[]; approved: ApprovedRowData[] },
  queueView?: "list" | "cards",
) {
  return render(
    <ToastProvider>
      <QueueView items={ideas} review={review} boards={boards} view={queueView} />
    </ToastProvider>,
  );
}

describe("the queue's red count (#59)", () => {
  it("shows the number of pending posts on the To review tab", () => {
    view({ pending, approved });
    expect(
      within(screen.getByRole("tab", { name: /To review/ })).getByLabelText("2 need attention"),
    ).toBeTruthy();
  });

  it("shows no badge when nothing is pending", () => {
    view({ pending: [], approved });
    expect(screen.queryByLabelText(/need attention/)).toBeNull();
  });

  it("never shows a badge on the Ideas tab", () => {
    view({ pending, approved });
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(within(screen.getByRole("tab", { name: "Ideas" })).queryByLabelText(/need attention/)).toBeNull();
  });
});

describe("the queue's lists and filters (#59)", () => {
  it("lists the pending posts as buttons that open the review", () => {
    view({ pending, approved });
    expect(screen.getByRole("button", { name: "Review: A study space" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review: A bike stand" })).toBeTruthy();
  });

  it("filters both lists by board", () => {
    view({ pending, approved });
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "GIB" } });
    expect(screen.queryByRole("button", { name: "Review: A study space" })).toBeNull();
    expect(screen.getByRole("button", { name: "Review: A bike stand" })).toBeTruthy();
    expect(screen.getByText("Nothing approved in the last 14 days.")).toBeTruthy();
  });

  it("lists recently approved ideas with a take down button", () => {
    view({ pending, approved });
    expect(screen.getByRole("heading", { name: "Recently approved" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "A food pantry" }).getAttribute("href")).toBe("/ideas/157");
    expect(screen.getByRole("button", { name: "Take down #157" })).toBeTruthy();
    expect(screen.getByText("Approved 3 days ago")).toBeTruthy();
  });

  it("opens a decision drawer with the post's title", async () => {
    view({ pending, approved });
    fireEvent.click(screen.getByRole("button", { name: "Review: A study space" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "A study space" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Approve and post" })).toBeTruthy();
  });

  it("opens the take-down dialog", async () => {
    view({ pending, approved });
    fireEvent.click(screen.getByRole("button", { name: "Take down #157" }));
    expect(await screen.findByRole("dialog", { name: "Take down #157?" })).toBeTruthy();
  });

  it("filters ideas by status on the Ideas tab and hides the sort on To review", () => {
    view({ pending, approved });
    expect(screen.queryByLabelText("Sort by")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(screen.getByRole("link", { name: "A food pantry" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "waiting" } });
    expect(screen.getByText("No ideas match these filters.")).toBeTruthy();
  });

  it("says what to do when nothing is pending", () => {
    view({ pending: [], approved: [] });
    expect(screen.getByText("Nothing to review right now. New posts appear here.")).toBeTruthy();
    expect(screen.getByText("Nothing approved in the last 14 days.")).toBeTruthy();
  });
});

describe("the queue's card view (#139)", () => {
  it("shows posters, not the list, on the Ideas tab when view is cards", () => {
    const { container } = view({ pending, approved }, "cards");
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(container.querySelectorAll("article.poster").length).toBe(1);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("switches view in place, keeping the tab and filters", () => {
    const { container } = view({ pending, approved });
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    fireEvent.click(screen.getByRole("link", { name: /Cards/ }));
    expect(container.querySelectorAll("article.poster").length).toBe(ideas.length);
    expect(screen.getByRole("tab", { name: "Ideas" }).getAttribute("aria-selected")).toBe("true");
  });

  it("names the active view for screen readers", () => {
    view({ pending, approved });
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    const current = screen.getByRole("link", { name: /List/ });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.textContent).toContain("(showing)");
  });

  it("shows the list by default on the Ideas tab", () => {
    view({ pending, approved });
    fireEvent.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(screen.getByRole("list")).toBeTruthy();
  });

  it("keeps the review list on the To review tab, whatever the view", () => {
    const { container } = view({ pending, approved }, "cards");
    expect(container.querySelectorAll("article.poster").length).toBe(0);
    expect(screen.getByRole("button", { name: "Review: A study space" })).toBeTruthy();
  });
});
