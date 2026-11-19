import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditPostView } from "./EditPostView";
import { SAMPLE_OWN_POST } from "./sample";

// The edit page's body (#128): the reviewer's reason before the form for a declined
// post, and a status block with no form for any other status.
vi.mock("./actions", () => ({ postIdea: vi.fn(), resubmitIdea: vi.fn(), withdrawIdea: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

describe("EditPostView (#128)", () => {
  it("shows the reason before the form, in document order", () => {
    render(<EditPostView data={SAMPLE_OWN_POST} pendingCount={1} />);
    expect(screen.getByRole("heading", { level: 1, name: "Edit your post" })).toBeTruthy();
    expect(
      screen.getByText(/Only you, the board.s reviewer, and the VP of Campus Affairs can see it/),
    ).toBeTruthy();
    const label = screen.getByText("Why it was not approved");
    const reason = screen.getByText(SAMPLE_OWN_POST.reason!);
    const form = screen.getByRole("form", { name: "Edit your post" });
    expect(label.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reason.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getByText("Change what the reviewer asked for, then send it for review again."),
    ).toBeTruthy();
  });

  it("prefills the form and passes the pending count", () => {
    render(<EditPostView data={SAMPLE_OWN_POST} pendingCount={1} />);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe(SAMPLE_OWN_POST.values.title);
    expect(screen.getByText("You have 1 pending post. Students can have up to 3.")).toBeTruthy();
  });

  it("says so when the reviewer left no reason", () => {
    render(<EditPostView data={{ ...SAMPLE_OWN_POST, reason: null }} pendingCount={0} />);
    expect(screen.getByText("The reviewer did not leave a reason.")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Edit your post" })).toBeTruthy();
  });

  it("pending: says there is nothing to change, with no form", () => {
    render(
      <EditPostView data={{ ...SAMPLE_OWN_POST, reviewStatus: "pending", reason: null }} pendingCount={1} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Waiting for review" })).toBeTruthy();
    expect(
      screen.getByText("There is nothing to change yet. If it is declined, you can edit it here."),
    ).toBeTruthy();
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByRole("link", { name: "Back to my ideas" }).getAttribute("href")).toBe("/me");
  });

  it("approved: says it is public and links to the idea, with no form", () => {
    render(
      <EditPostView
        data={{ ...SAMPLE_OWN_POST, reviewStatus: "approved", number: 142, reason: null }}
        pendingCount={0}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Approved" })).toBeTruthy();
    expect(screen.getByText("This idea is public now, so it can no longer be edited.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "See the idea" }).getAttribute("href")).toBe("/ideas/142");
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("withdrawn: says it was withdrawn, with no form", () => {
    render(
      <EditPostView
        data={{ ...SAMPLE_OWN_POST, reviewStatus: "withdrawn", reason: null }}
        pendingCount={0}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Withdrawn" })).toBeTruthy();
    expect(screen.getByText("You withdrew this post. It will not be reviewed.")).toBeTruthy();
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("link", { name: "See the idea" })).toBeNull();
  });

  it("does not promise action", () => {
    render(<EditPostView data={SAMPLE_OWN_POST} pendingCount={0} />);
    expect(document.body.textContent).not.toMatch(/petition|will be approved|will be built|we will/i);
  });
});
