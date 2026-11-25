import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApprovedRowData, ReviewRowData } from "@/app/_review/present";
import { ToastProvider } from "@/components/Toast";
import { QueueView } from "./QueueView";

// The review list runs server actions and refreshes the router; neither is under test here.
vi.mock("@/app/_review/actions", () => ({
  approvePost: vi.fn(),
  declinePost: vi.fn(),
  sendBackPost: vi.fn(),
  takeDownPost: vi.fn(),
  approveEdit: vi.fn(),
  declineEdit: vi.fn(),
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
    edit: null,
  };
}
const pending = [pendingRow("a", "A study space", "CPAB"), pendingRow("b", "A bike stand", "GIB")];
const approved: ApprovedRowData[] = [
  { id: "c", number: 157, title: "A food pantry", boardId: "DAB", approvedText: "Approved 3 days ago" },
];
const boards = [
  { value: "CPAB" as const, label: "Campus Planning" },
  { value: "GIB" as const, label: "Green Initiatives" },
  { value: "DAB" as const, label: "Dining" },
];

function view(review: { pending: ReviewRowData[]; approved: ApprovedRowData[] }) {
  return render(
    <ToastProvider>
      <QueueView review={review} boards={boards} />
    </ToastProvider>,
  );
}

// The chips switch between the two lists (#221): one is on screen at a time.
const showApproved = () => fireEvent.click(screen.getByRole("button", { name: "Recently approved" }));

describe("the queue's chips (#221)", () => {
  it("shows To review first, and only that list", () => {
    view({ pending, approved });
    expect(screen.getByRole("button", { name: "To review" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Review: A study space" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Recently approved" })).toBeNull();
  });

  it("switches to Recently approved, and back, with the chips", () => {
    view({ pending, approved });
    showApproved();
    expect(screen.getByRole("button", { name: "Recently approved" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.queryByRole("button", { name: "Review: A study space" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Recently approved" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "To review" }));
    expect(screen.getByRole("button", { name: "Review: A study space" })).toBeTruthy();
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
    showApproved();
    expect(screen.getByText("Nothing approved in the last 14 days.")).toBeTruthy();
  });

  it("lists recently approved ideas with send back and take down buttons (#286)", () => {
    view({ pending, approved });
    showApproved();
    expect(screen.getByRole("heading", { name: "Recently approved" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "A food pantry" }).getAttribute("href")).toBe("/ideas/157");
    expect(screen.getByRole("button", { name: "Send back #157" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Take down #157" })).toBeTruthy();
    expect(screen.getByText(/Send one back if the student can fix it/)).toBeTruthy();
    expect(screen.getByText("Approved 3 days ago")).toBeTruthy();
  });

  it("opens a decision drawer with the post's title", async () => {
    view({ pending, approved });
    fireEvent.click(screen.getByRole("button", { name: "Review: A study space" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "A study space" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Approve and post" })).toBeTruthy();
  });

  it("opens the send-back dialog (#286)", async () => {
    view({ pending, approved });
    showApproved();
    fireEvent.click(screen.getByRole("button", { name: "Send back #157" }));
    expect(await screen.findByRole("dialog", { name: "Send #157 back to the student?" })).toBeTruthy();
  });

  it("opens the take-down dialog", async () => {
    view({ pending, approved });
    showApproved();
    fireEvent.click(screen.getByRole("button", { name: "Take down #157" }));
    expect(await screen.findByRole("dialog", { name: "Take down #157?" })).toBeTruthy();
  });

  it("has no tab selector and no Ideas controls (#221)", () => {
    view({ pending, approved });
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(screen.queryByLabelText("Sort by")).toBeNull();
    expect(screen.queryByRole("group", { name: "View" })).toBeNull();
  });

  describe("an edit to an approved post (#295)", () => {
    const editRow: ReviewRowData = {
      ...pendingRow("e", "A study space, open late", "CPAB"),
      isAnonymous: true,
      edit: {
        number: 120,
        changes: [{ label: "Title", before: "A study space", after: "A study space, open late" }],
        unchanged: ["Scale"],
        sentText: "Changes sent 3 days ago",
        mayApprove: true,
        boardAfter: "CPAB",
        movesTo: null,
      },
    };

    it("sits in the same list as new posts, tagged with the idea it changes", () => {
      view({ pending: [pendingRow("a", "A study space", "CPAB"), editRow], approved });
      expect(screen.getByRole("button", { name: "Review: A study space" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Review changes: A study space, open late" })).toBeTruthy();
      expect(screen.getByText("Changes to #120")).toBeTruthy();
      expect(screen.getAllByText("Anonymous to students")).toHaveLength(1);
    });

    it("opens the edit drawer, with the diff and Approve changes", async () => {
      view({ pending: [editRow], approved });
      fireEvent.click(screen.getByRole("button", { name: "Review changes: A study space, open late" }));
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("Changes to #120. The approved version stays public until you decide."),
      ).toBeTruthy();
      expect(within(dialog).getByRole("heading", { name: "What changed" })).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: "Approve changes" })).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: "Decline changes" })).toBeTruthy();
    });

    it("a new post's drawer is unchanged", async () => {
      view({ pending: [pendingRow("a", "A study space", "CPAB")], approved });
      fireEvent.click(screen.getByRole("button", { name: "Review: A study space" }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).queryByRole("heading", { name: "What changed" })).toBeNull();
      expect(within(dialog).getByRole("button", { name: "Approve and post" })).toBeTruthy();
    });
  });

  it("says what to do when nothing is pending or approved", () => {
    view({ pending: [], approved: [] });
    expect(screen.getByText("Nothing to review right now. New posts appear here.")).toBeTruthy();
    showApproved();
    expect(screen.getByText("Nothing approved in the last 14 days.")).toBeTruthy();
  });
});
