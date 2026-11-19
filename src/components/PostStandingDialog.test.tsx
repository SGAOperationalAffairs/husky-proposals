// Tests for Learn more on a student's own pending or declined post (#200).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PostStandingDialog, type PostStandingDialogData } from "./PostStandingDialog";

afterEach(cleanup);

const editHref = "/me/ideas/6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10/edit";

const pending: PostStandingDialogData = {
  title: "Longer hours at the Marino dining hall on Sundays",
  board: "DAB",
  review: "pending",
  waitText: "Reviewers aim to decide within 2 days.",
};

const declined: PostStandingDialogData = {
  title: "Bike repair stand by the garage",
  board: "GIB",
  review: "declined",
  declineReason: "This is already in progress with Campus Services. Support the existing idea instead.",
  editHref,
};

function open(data: PostStandingDialogData) {
  render(<PostStandingDialog {...data} />);
  fireEvent.click(screen.getByRole("button", { name: /^Learn more/ }));
  return screen.getByRole("dialog");
}

describe("post standing dialog trigger (#200)", () => {
  it("is a button named for the post, and never a link", () => {
    render(<PostStandingDialog {...pending} />);
    const trigger = screen.getByRole("button", { name: /^Learn more/ });
    expect(trigger.textContent).toContain(pending.title);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("post standing dialog, pending (#200)", () => {
  it("says who reviews it and when, in the board's color", () => {
    const dialog = open(pending);
    expect(screen.getByRole("dialog", { name: "Waiting for review" })).toBe(dialog);
    expect(dialog.getAttribute("data-board")).toBe("dining");
    expect(dialog.textContent).toContain(pending.title);
    expect(dialog.textContent).toContain("Dining Advisory Board");
    expect(dialog.textContent).toContain("chair or director, or the VP of Campus Affairs");
    expect(dialog.textContent).toContain(pending.waitText);
  });

  it("names the email setting and links to the notification settings", () => {
    const dialog = open(pending);
    expect(dialog.textContent).toContain("Decisions on my posts");
    expect(screen.getByRole("link", { name: "Notification settings" }).getAttribute("href")).toBe(
      "/me/notifications",
    );
  });

  it("says only the author and reviewers can see it, and has no edit link", () => {
    const dialog = open(pending);
    expect(dialog.textContent).toContain("only you, the board's reviewer, and the VP of Campus Affairs");
    expect(screen.queryByRole("link", { name: "Edit and resubmit" })).toBeNull();
  });

  it("closes with Close", () => {
    open(pending);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("post standing dialog, declined (#200)", () => {
  it("shows the full reason", () => {
    const dialog = open(declined);
    expect(screen.getByRole("dialog", { name: "Not approved" })).toBe(dialog);
    expect(dialog.getAttribute("data-board")).toBe("green");
    expect(dialog.textContent).toContain(declined.declineReason);
  });

  it("says the reviewer left no reason when there is none", () => {
    const dialog = open({ ...declined, declineReason: undefined });
    expect(dialog.textContent).toContain("The reviewer did not leave a reason.");
  });

  it("offers Edit and resubmit to the edit page", () => {
    open(declined);
    expect(screen.getByRole("link", { name: "Edit and resubmit" }).getAttribute("href")).toBe(editHref);
  });

  it("has no edit link without an editHref", () => {
    open({ ...declined, editHref: undefined });
    expect(screen.queryByRole("link", { name: "Edit and resubmit" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});

describe("post standing dialog never goes public (#200)", () => {
  it.each([pending, declined])(
    "shows no public link, support count, or support wording ($review)",
    (data) => {
      const dialog = open(data);
      expect(dialog.querySelectorAll('a[href^="/ideas/"]')).toHaveLength(0);
      expect(dialog.textContent).not.toMatch(/students? (want|supported)|will help|petition/i);
      expect(dialog.textContent).not.toMatch(/\d+ (students|people)/i);
    },
  );
});
