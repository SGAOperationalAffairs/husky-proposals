// Tests for the outlined poster for posts that are not public yet (#194). Written first.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PendingPoster } from "./PendingPoster";

afterEach(cleanup);

const base = {
  number: 201,
  title: "Longer hours at the Marino dining hall on Sundays",
  board: "DAB" as const,
};

describe("PendingPoster (#194)", () => {
  it("says a pending post is waiting for review, in words", () => {
    render(<PendingPoster {...base} review="pending" />);
    expect(screen.getByText("Waiting for review")).toBeTruthy();
  });

  it("says a declined post is not approved, and shows the written reason", () => {
    render(
      <PendingPoster {...base} review="declined" declineReason="Already in progress with Campus Services." />,
    );
    expect(screen.getByText("Not approved")).toBeTruthy();
    expect(screen.getByText("Already in progress with Campus Services.")).toBeTruthy();
  });

  it("never shows a support count or a students line", () => {
    render(<PendingPoster {...base} review="pending" />);
    expect(screen.queryByText(/students?/i)).toBeNull();
    expect(screen.queryByText(/support/i)).toBeNull();
  });

  it("is not a link, because there is no public page yet", () => {
    const { container } = render(<PendingPoster {...base} review="pending" />);
    expect(container.querySelector("a")).toBeNull();
  });

  it("uses the outlined look, not the filled poster", () => {
    const { container } = render(<PendingPoster {...base} review="pending" />);
    expect(container.querySelector("article")?.className).toContain("poster-outline");
  });
});
