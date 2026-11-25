import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReviewRowData } from "@/app/_review/present";
import { DecisionSheet } from "./DecisionSheet";

afterEach(cleanup);

// The decision drawer (#59). Invented people; handlers are spies.
const row: ReviewRowData = {
  id: "00000000-0000-7000-8000-000000000001",
  title: "A quiet study room",
  description: "Set aside one corner.",
  paragraphs: ["First paragraph.", "Second paragraph."],
  boardId: "DAB",
  facts: [
    { term: "Scale", value: "Small" },
    { term: "Rough cost", value: "Not sure" },
  ],
  sentText: "Sent 2 days ago",
  due: { text: "1 day overdue", overdue: true },
  isAnonymous: false,
  poster: { kind: "named", name: "Maya Test", email: "maya.test@example.com" },
  edit: null,
};

function setup(overrides: Partial<Parameters<typeof DecisionSheet>[0]> = {}) {
  const props = {
    row,
    open: true,
    busy: null,
    error: null,
    onApprove: vi.fn(),
    onDecline: vi.fn(),
    onClose: vi.fn(),
    returnFocus: createRef<HTMLElement>(),
    ...overrides,
  };
  render(<DecisionSheet {...props} />);
  return props;
}

describe("decision drawer (#59)", () => {
  it("shows the post, its due text, and the facts", () => {
    setup();
    expect(screen.getByRole("heading", { name: "A quiet study room" })).toBeTruthy();
    expect(screen.getByText("Dining Advisory Board")).toBeTruthy();
    expect(screen.getByText("Sent 2 days ago")).toBeTruthy();
    expect(screen.getByText("1 day overdue")).toBeTruthy();
    expect(screen.getByText("Second paragraph.")).toBeTruthy();
    expect(screen.getByText("Rough cost")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("names a named poster", () => {
    setup();
    expect(screen.getByText("Posted by Maya Test, maya.test@example.com")).toBeTruthy();
  });

  it("explains an anonymous post whose name this viewer may see", () => {
    setup({
      row: {
        ...row,
        isAnonymous: true,
        poster: { kind: "anonymous_visible", name: "Maya Test", email: "maya.test@example.com" },
      },
    });
    expect(screen.getByText("Anonymous to students")).toBeTruthy();
    expect(
      screen.getByText(/Only this board.s reviewer and the VP of Campus Affairs see this name/),
    ).toBeTruthy();
  });

  it("shows no name for an anonymous post hidden from this viewer", () => {
    setup({ row: { ...row, isAnonymous: true, poster: { kind: "anonymous_hidden" } } });
    expect(screen.getByText(/You can.t see who posted it/)).toBeTruthy();
    expect(screen.queryByText(/Maya/)).toBeNull();
    expect(screen.queryByText(/example\.com/)).toBeNull();
  });

  it("says when the account was deleted", () => {
    setup({ row: { ...row, poster: { kind: "deleted" } } });
    expect(screen.getByText("Posted by a student whose account was deleted.")).toBeTruthy();
  });

  it("approves", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Approve and post" }));
    expect(props.onApprove).toHaveBeenCalledTimes(1);
  });

  it("refuses an empty reason and calls nothing", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.change(screen.getByLabelText(/^Reason the student will see/), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send decline" }));
    expect(props.onDecline).not.toHaveBeenCalled();
    expect(screen.getByText("Write a reason so the student knows what to change.")).toBeTruthy();
  });

  it("declines with the reason", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.change(screen.getByLabelText(/^Reason the student will see/), {
      target: { value: "Please say which hall the event will be held in, so the student can add it." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send decline" }));
    expect(props.onDecline).toHaveBeenCalledWith(
      "Please say which hall the event will be held in, so the student can add it.",
    );
  });

  it("moves focus into the reason field", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(document.activeElement).toBe(screen.getByLabelText(/^Reason the student will see/));
  });

  it("cancels the decline without closing", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Approve and post" })).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const props = setup();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("shows an error in an alert", () => {
    setup({ error: { text: "Someone already decided this post." } });
    expect(screen.getByRole("alert").textContent).toBe("Someone already decided this post.");
  });

  it("shows a reason error on the field, not in an alert", () => {
    setup({ error: { text: "Write a reason so the student knows what to change.", field: "reason" } });
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText(/^Reason the student will see/).getAttribute("aria-invalid")).toBe("true");
  });

  it("disables the buttons and says what is happening while busy", () => {
    const props = setup({ busy: "approve" });
    const approve = screen.getByRole("button", { name: "Approving…" });
    expect(approve.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Decline" }).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(approve);
    expect(props.onApprove).not.toHaveBeenCalled();
  });
});

// An author's edit to an approved post (#295): the same drawer, with the diff first.
describe("decision drawer, an edit (#295)", () => {
  const edit = {
    number: 103,
    changes: [
      { label: "Title", before: "An older title", after: "A quiet study room" },
      { label: "Scale", before: "Small", after: "Large" },
    ],
    unchanged: ["Rough cost", "Timing"],
    sentText: "Changes sent 2 days ago",
    mayApprove: true,
    boardAfter: "DAB" as const,
    movesTo: null,
  };
  const editRow: ReviewRowData = { ...row, edit };

  it("shows the board, when the changes were sent, and what stays public until a decision", () => {
    setup({ row: editRow });
    expect(screen.getByText("Dining Advisory Board")).toBeTruthy();
    expect(screen.getByText("Changes sent 2 days ago")).toBeTruthy();
    expect(screen.getByText("1 day overdue")).toBeTruthy();
    expect(
      screen.getByText("Changes to #103. The approved version stays public until you decide."),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "A quiet study room" })).toBeTruthy();
  });

  it("lists each changed field with Before and After, then what did not change", () => {
    setup({ row: editRow });
    expect(screen.getByRole("heading", { name: "What changed" })).toBeTruthy();
    expect(screen.getByText("An older title")).toBeTruthy();
    expect(screen.getAllByText("Before")).toHaveLength(2);
    expect(screen.getAllByText("After")).toHaveLength(2);
    expect(screen.getByText("Large")).toBeTruthy();
    expect(screen.getByText("Not changed: Rough cost, Timing.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The new version" })).toBeTruthy();
    expect(screen.getByText("Second paragraph.")).toBeTruthy();
  });

  it("approves with Approve changes", () => {
    const props = setup({ row: editRow });
    expect(screen.queryByRole("button", { name: "Approve and post" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Approve changes" }));
    expect(props.onApprove).toHaveBeenCalledTimes(1);
  });

  it("says Approving while busy", () => {
    setup({ row: editRow, busy: "approve" });
    expect(screen.getByRole("button", { name: "Approving…" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("declines with Decline changes, a hint that the approved version stays public, and Send decline", () => {
    const props = setup({ row: editRow });
    fireEvent.click(screen.getByRole("button", { name: "Decline changes" }));
    expect(
      screen.getByText(/Say what to change\. The approved version stays public\. At least 40 characters\./),
    ).toBeTruthy();
    const reason = "Please say which hall the study room would go in, so the student can add it.";
    fireEvent.change(screen.getByLabelText(/^Reason the student will see/), { target: { value: reason } });
    fireEvent.click(screen.getByRole("button", { name: "Send decline" }));
    expect(props.onDecline).toHaveBeenCalledWith(reason);
  });

  it("a board move this viewer cannot approve: no Approve button, a note, and Decline stays", () => {
    const props = setup({
      row: { ...editRow, edit: { ...edit, mayApprove: false, boardAfter: "CSC", movesTo: "CSC" } },
    });
    expect(screen.queryByRole("button", { name: "Approve changes" })).toBeNull();
    expect(
      screen.getByText(
        "This moves the idea to the Campus Services Committee. Only the VP of Campus Affairs can approve a move. You can decline it with a reason.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Decline changes" }));
    expect(screen.getByLabelText(/^Reason the student will see/)).toBeTruthy();
    expect(props.onApprove).not.toHaveBeenCalled();
  });
});
