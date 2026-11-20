// Tests for the muted card for posts that are not public yet (#193, #194). Written first.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BOARDS } from "@/core/boards";
import { PendingIdeaCard } from "./PendingIdeaCard";

afterEach(cleanup);

const pending = {
  number: 201,
  title: "Longer hours at the Marino dining hall on Sundays",
  description: "The Sunday hours end at 2 p.m. Students who study on weekends want dinner until 8.",
  board: "DAB" as const,
  review: "pending" as const,
};

const declined = {
  ...pending,
  number: 202,
  title: "Bike repair stand by the garage",
  board: "GIB" as const,
  review: "declined" as const,
  declineReason: "This is already in progress with Campus Services. Support the existing idea instead.",
};

describe("pending idea card, waiting for review (#194)", () => {
  it("shows the status words and the word PENDING in the number slot", () => {
    render(<PendingIdeaCard {...pending} />);
    expect(screen.getByText("Waiting for review")).toBeTruthy();
    expect(screen.getByText("PENDING")).toBeTruthy();
  });

  it("renders the board category as text", () => {
    render(<PendingIdeaCard {...pending} />);
    expect(screen.getByText(BOARDS.DAB.category)).toBeTruthy();
  });

  it("shows no support count and no supporter wording", () => {
    const { container } = render(<PendingIdeaCard {...pending} />);
    expect(container.querySelector(".poster-number")).toBeNull();
    expect(document.body.textContent).not.toMatch(/students? (want|supported)/);
    expect(document.body.textContent).not.toMatch(/will help/);
  });

  it("links to no public idea page", () => {
    const { container } = render(<PendingIdeaCard {...pending} />);
    expect(container.querySelectorAll('a[href^="/ideas/"]')).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Learn more/ })).toBeNull();
  });

  it("shows the student's own support and participation on their pending post", () => {
    render(<PendingIdeaCard {...pending} supported participating />);
    expect(screen.getByRole("button", { name: "Support" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "I'll participate" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("keeps the support and participate buttons, and offers no edit or withdraw", () => {
    render(<PendingIdeaCard {...pending} />);
    expect(screen.getByRole("button", { name: "Support" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "I'll participate" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Withdraw" })).toBeNull();
  });
});

describe("pending idea card, Learn more (#200)", () => {
  it("is a button that opens the waiting dialog on a pending post", () => {
    render(<PendingIdeaCard {...pending} waitText="Reviewers aim to decide within 2 days." />);
    fireEvent.click(screen.getByRole("button", { name: /^Learn more/ }));
    expect(screen.getByRole("dialog", { name: "Waiting for review" }).textContent).toContain(
      "Reviewers aim to decide within 2 days.",
    );
  });

  it("is a button that opens the full reason on a declined post", () => {
    render(<PendingIdeaCard {...declined} />);
    fireEvent.click(screen.getByRole("button", { name: /^Learn more/ }));
    expect(screen.getByRole("dialog", { name: "Not approved" }).textContent).toContain(
      declined.declineReason,
    );
  });
});

const sentBack = {
  ...declined,
  number: 203,
  review: "sent_back" as const,
  declineReason: "Add the cost and the place, then send it again for review.",
};
const takenDown = {
  ...declined,
  number: 204,
  review: "taken_down" as const,
  declineReason: "It names a person.",
};
const editHref = "/me/ideas/6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10/edit";

describe("pending idea card, sent back (#286)", () => {
  it("says Sent back, shows the reason and SENT BACK, and keeps Edit and Withdraw", () => {
    render(<PendingIdeaCard {...sentBack} editHref={editHref} />);
    expect(screen.getByText("Sent back")).toBeTruthy();
    expect(screen.getByText("SENT BACK")).toBeTruthy();
    expect(screen.getByText(sentBack.declineReason)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe(editHref);
    expect(screen.getByRole("link", { name: "Withdraw" }).getAttribute("href")).toBe(`${editHref}#withdraw`);
  });

  it("opens the reason under Why it was sent back, with a way to edit", () => {
    render(<PendingIdeaCard {...sentBack} editHref={editHref} />);
    fireEvent.click(screen.getByRole("button", { name: /^Learn more/ }));
    const dialog = screen.getByRole("dialog", { name: "Sent back" });
    expect(dialog.textContent).toContain("Why it was sent back");
    expect(dialog.textContent).toContain(sentBack.declineReason);
    expect(screen.getByRole("link", { name: "Edit and resubmit" })).toBeTruthy();
  });
});

describe("pending idea card, taken down (#286)", () => {
  it("says Taken down, shows the reason and TAKEN DOWN, and offers no Edit or Withdraw", () => {
    render(<PendingIdeaCard {...takenDown} editHref={editHref} />);
    expect(screen.getByText("Taken down")).toBeTruthy();
    expect(screen.getByText("TAKEN DOWN")).toBeTruthy();
    expect(screen.getByText(takenDown.declineReason)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Withdraw" })).toBeNull();
  });

  it("opens the reason under Why it was taken down, with no way to edit", () => {
    render(<PendingIdeaCard {...takenDown} editHref={editHref} />);
    fireEvent.click(screen.getByRole("button", { name: /^Learn more/ }));
    const dialog = screen.getByRole("dialog", { name: "Taken down" });
    expect(dialog.textContent).toContain("Why it was taken down");
    expect(dialog.textContent).toContain("can no longer be edited or sent for review again");
    expect(screen.queryByRole("link", { name: "Edit and resubmit" })).toBeNull();
  });
});

describe("pending idea card, declined (#194, #128)", () => {
  it("says the post is not approved, shows the reason, and shows DECLINED", () => {
    render(<PendingIdeaCard {...declined} />);
    expect(screen.getByText("Not approved")).toBeTruthy();
    expect(screen.getByText(declined.declineReason)).toBeTruthy();
    expect(screen.getByText("DECLINED")).toBeTruthy();
  });

  it("links Edit to the edit page and Withdraw to its withdraw section", () => {
    const editHref = "/me/ideas/6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10/edit";
    render(<PendingIdeaCard {...declined} editHref={editHref} />);
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe(editHref);
    expect(screen.getByRole("link", { name: "Withdraw" }).getAttribute("href")).toBe(`${editHref}#withdraw`);
  });

  it("shows neither link without an editHref", () => {
    render(<PendingIdeaCard {...declined} />);
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Withdraw" })).toBeNull();
  });

  it("still links to no public idea page and shows no count", () => {
    const { container } = render(<PendingIdeaCard {...declined} />);
    expect(container.querySelectorAll('a[href^="/ideas/"]')).toHaveLength(0);
    expect(container.querySelector(".poster-number")).toBeNull();
  });
});
