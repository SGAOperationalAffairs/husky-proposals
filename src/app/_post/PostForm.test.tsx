import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PENDING_LIMIT_REASON, pendingPostsText } from "@/core/review";
import { PostForm } from "./PostForm";

// The post form (#55): a board is picked first, then the rest of the form opens.
// Covers the anonymous notice, the pending limit, and the
// check on submit. The post action (#54) is not wired yet.

afterEach(cleanup);

function pickBoard(name: RegExp | string = /^Dining/) {
  fireEvent.click(screen.getByRole("button", { name }));
}

const submit = () => screen.getByRole("button", { name: "Post idea" });

describe("PostForm, board first", () => {
  it("shows one line on each tile, about the category, with no board name (#55)", () => {
    render(<PostForm pendingCount={0} />);
    expect(screen.getByText("Meals, dining halls, and food on campus.")).toBeTruthy();
    expect(
      screen.getByText("Projects that make campus greener, like energy, water, and waste."),
    ).toBeTruthy();
    const tile = screen.getByRole("button", { name: /Campus Services/ });
    expect(tile.textContent).toContain("Everyday services on campus, like facilities, mail, and IT.");
    expect(tile.textContent).not.toContain("Campus Services Committee");
  });

  it("draws the form on the page, with no white panel, border, or outer padding", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    const form = screen.getByRole("form", { name: "Post an idea" });
    expect(form.className).not.toMatch(/bg-surface|bordered|\bp-/);
  });
  it("shows the five boards and no other fields until one is picked", () => {
    render(<PostForm pendingCount={0} />);
    expect(screen.getByRole("group").querySelectorAll("button").length).toBe(5);
    expect(screen.queryByLabelText("Title")).toBeNull();
    expect(screen.queryByRole("button", { name: "Post idea" })).toBeNull();
  });

  it("opens the rest of the form, with the board's color, once a board is picked", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByLabelText("Short description")).toBeTruthy();
    expect(screen.getByLabelText("Detailed description")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Post an idea" }).getAttribute("data-board")).toBe("dining");
    expect(screen.getByText("Dining", { selector: "p" })).toBeTruthy();
  });

  it("puts focus on the title once a board is picked", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
  });

  it("lets a student change the board, and keeps what they typed", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Later dining hours" } });
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    expect(screen.queryByLabelText("Title")).toBeNull();
    pickBoard(/^Green Initiatives/);
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Later dining hours");
    expect(screen.getByRole("form", { name: "Post an idea" }).getAttribute("data-board")).toBe("green");
  });
});

describe("PostForm", () => {
  it("says exactly who can see the name when posting anonymously", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.click(screen.getByRole("checkbox", { name: /post anonymously/i }));
    expect(
      screen.getByText(/only the board.s reviewer and the VP of Campus Affairs will see who posted it/i),
    ).toBeTruthy();
  });

  it("refuses a fourth pending post and says why (#132)", () => {
    render(<PostForm pendingCount={3} />);
    pickBoard();
    const banner = screen.getByRole("status");
    expect(banner.textContent).toBe(PENDING_LIMIT_REASON);
    expect(submit().getAttribute("aria-disabled")).toBe("true");
    // The fieldset disables the field, so check the :disabled state, not the property.
    expect(screen.getByLabelText("Title").matches(":disabled")).toBe(true);
    const described = submit().getAttribute("aria-describedby")!.split(" ");
    const text = described.map((id) => document.getElementById(id)?.textContent).join(" ");
    expect(text).toContain(pendingPostsText(3));
    expect(text).toContain(PENDING_LIMIT_REASON);
  });

  it("does not show field errors when the disabled button is pressed at the limit (#132)", () => {
    render(<PostForm pendingCount={3} />);
    pickBoard();
    fireEvent.click(submit());
    expect(screen.queryByText("Add a title, up to 120 characters.")).toBeNull();
  });

  it("moves focus to the limit message at the limit (#132)", () => {
    render(<PostForm pendingCount={3} />);
    pickBoard();
    expect(document.activeElement).toBe(screen.getByRole("status"));
  });

  it.each([0, 1, 2])("shows the count and allows posting at %i pending (#132)", (n) => {
    render(<PostForm pendingCount={n} />);
    pickBoard();
    const line = screen.getByText(pendingPostsText(n));
    expect(screen.queryByRole("status")).toBeNull();
    expect(submit().getAttribute("aria-disabled")).toBeNull();
    expect(submit().getAttribute("aria-describedby")).toBe(line.id);
  });

  it("marks the fields that need fixing, with a message that says what to do", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.click(submit());
    expect(screen.getByLabelText("Title").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Short description").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Add a title, up to 120 characters.")).toBeTruthy();
    expect(screen.getByText("Add a summary, up to 140 characters.")).toBeTruthy();
  });

  it("moves focus to the first field with an error", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.click(submit());
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
  });

  it("does not say anything promises action", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    expect(document.body.textContent).not.toMatch(/petition|will be approved|will be built|we will/i);
  });
});
