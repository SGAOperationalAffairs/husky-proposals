// Tests for the muted card for posts that are not public yet (#193, #194). Written first.
import { cleanup, render, screen } from "@testing-library/react";
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

  it("keeps the support and participate buttons, and offers no edit or withdraw", () => {
    render(<PendingIdeaCard {...pending} />);
    expect(screen.getByRole("button", { name: "Support" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "I'll participate" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Withdraw" })).toBeNull();
  });
});

describe("pending idea card, declined (#194, #128)", () => {
  it("says the post is not approved, shows the reason, and shows DECLINED", () => {
    render(<PendingIdeaCard {...declined} />);
    expect(screen.getByText("Not approved")).toBeTruthy();
    expect(screen.getByText(declined.declineReason)).toBeTruthy();
    expect(screen.getByText("DECLINED")).toBeTruthy();
  });

  it("offers Edit and Withdraw as links, placeholders that point at My ideas for now", () => {
    render(<PendingIdeaCard {...declined} />);
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe("/me");
    expect(screen.getByRole("link", { name: "Withdraw" }).getAttribute("href")).toBe("/me");
  });

  it("still links to no public idea page and shows no count", () => {
    const { container } = render(<PendingIdeaCard {...declined} />);
    expect(container.querySelectorAll('a[href^="/ideas/"]')).toHaveLength(0);
    expect(container.querySelector(".poster-number")).toBeNull();
  });
});
