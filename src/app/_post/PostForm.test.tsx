import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parsePostIdea } from "@/core/postIdea";
import { PENDING_LIMIT_REASON, RESUBMIT_LIMIT_REASON, pendingPostsText } from "@/core/review";
import { loadDraft, saveDraft } from "./draft";
import { PostForm } from "./PostForm";
import { editIdea, postIdea, resubmitIdea, withdrawIdea } from "./actions";

// The post form (#55): a board is picked first, then the rest of the form opens.
// Covers the anonymous notice, the pending limit, the check on submit, and what a
// valid submit shows for each result of the post action (#181).

vi.mock("./actions", () => ({
  postIdea: vi.fn(),
  resubmitIdea: vi.fn(),
  withdrawIdea: vi.fn(),
  editIdea: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const post = vi.mocked(postIdea);
const resubmit = vi.mocked(resubmitIdea);
const withdraw = vi.mocked(withdrawIdea);
const editApproved = vi.mocked(editIdea);

beforeEach(() => {
  post.mockReset();
  resubmit.mockReset();
  withdraw.mockReset();
  editApproved.mockReset();
  sessionStorage.clear();
  window.location.hash = "";
});
afterEach(cleanup);

const DETAILS =
  "The dining hall closes at 7 on Sundays, so students who finish class late have no hot meal on campus.";

function fillValid() {
  fireEvent.click(screen.getByRole("button", { name: /^Dining/ }));
  fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Later dining hours" } });
  fireEvent.change(screen.getByLabelText(/^Short description/), {
    target: { value: "Open until midnight." },
  });
  fireEvent.change(screen.getByLabelText(/^Detailed description/), { target: { value: DETAILS } });
}

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
    expect(screen.getByLabelText(/^Title/)).toBeTruthy();
    expect(screen.getByLabelText(/^Short description/)).toBeTruthy();
    expect(screen.getByLabelText(/^Detailed description/)).toBeTruthy();
    expect(screen.getByRole("form", { name: "Post an idea" }).getAttribute("data-board")).toBe("dining");
    expect(screen.getByText("Dining", { selector: "p" })).toBeTruthy();
  });

  it("puts focus on the title once a board is picked", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    expect(document.activeElement).toBe(screen.getByLabelText(/^Title/));
  });

  it("lets a student change the board, and keeps what they typed", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Later dining hours" } });
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    expect(screen.queryByLabelText("Title")).toBeNull();
    pickBoard(/^Green Initiatives/);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
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
    expect(screen.getByLabelText(/^Title/).matches(":disabled")).toBe(true);
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

  it("shows no count line to a visitor, and still allows posting (#96)", () => {
    render(<PostForm pendingCount={null} />);
    pickBoard();
    expect(screen.queryByText(/pending post/)).toBeNull();
    expect(submit().getAttribute("aria-disabled")).toBeNull();
    expect(submit().getAttribute("aria-describedby")).toBeNull();
  });

  it("marks the fields that need fixing, with a message that says what to do", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.click(submit());
    expect(screen.getByLabelText(/^Title/).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText(/^Short description/).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Add a title, up to 120 characters.")).toBeTruthy();
    expect(screen.getByText("Add a summary, up to 140 characters.")).toBeTruthy();
  });

  // The location field had no limit on the page, so a long location only failed on submit,
  // with a message that said "under 120" while the rule allows 120 (#197).
  it("limits the location to 120 characters, on the field and in the message", () => {
    post.mockResolvedValue({ ok: true, id: "abc" });
    render(<PostForm pendingCount={0} />);
    fillValid();
    const location = screen.getByLabelText(/^Where on campus/) as HTMLInputElement;
    expect(location.maxLength).toBe(120);
    fireEvent.change(location, { target: { value: "x".repeat(121) } });
    fireEvent.click(submit());
    expect(post).not.toHaveBeenCalled();
    expect(location.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Keep the location up to 120 characters.")).toBeTruthy();
  });

  it("moves focus to the first field with an error", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.click(submit());
    expect(document.activeElement).toBe(screen.getByLabelText(/^Title/));
  });

  it("does not say anything promises action", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    expect(document.body.textContent).not.toMatch(/petition|will be approved|will be built|we will/i);
  });
});

describe("PostForm, sending the post (#181)", () => {
  it("calls postIdea once with the checked data", async () => {
    post.mockResolvedValue({ ok: true, id: "abc" });
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    await screen.findByText("Sent for review");
    const expected = parsePostIdea({
      title: "Later dining hours",
      summary: "Open until midnight.",
      details: DETAILS,
      category: "dining",
      location: "",
      scale: undefined,
      costBand: undefined,
      timeHorizon: undefined,
      anonymous: false,
    });
    expect(expected.success).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(expected.data);
  });

  it("does not call postIdea for an invalid form", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    fireEvent.click(submit());
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the confirmation, moves focus to it, and lets the student post another", async () => {
    post.mockResolvedValue({ ok: true, id: "abc" });
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    const heading = await screen.findByText("Sent for review");
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByLabelText("Title")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(heading));

    fireEvent.click(screen.getByRole("button", { name: "Post another idea" }));
    expect(screen.queryByText("Sent for review")).toBeNull();
    expect(screen.getByRole("group").querySelectorAll("button").length).toBe(5);
  });

  it("shows the sign-in prompt, keeps the input, and keeps a draft for after sign-in", async () => {
    post.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe("/sign-in?next=%2Fpost");
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
    expect(loadDraft()?.title).toBe("Later dining hours");
  });

  it("restores a kept draft when the form opens, then clears it", async () => {
    post.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    const first = render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    await screen.findByRole("link", { name: "Sign in" });
    first.unmount();

    render(<PostForm pendingCount={0} />);
    await waitFor(() =>
      expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours"),
    );
    expect(screen.getByRole("form", { name: "Post an idea" }).getAttribute("data-board")).toBe("dining");
    expect(loadDraft()).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("does not call postIdea again while a post is in flight", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof postIdea>>) => void;
    post.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    const button = await screen.findByRole("button", { name: "Posting" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    fireEvent.submit(screen.getByRole("form", { name: "Post an idea" }));
    expect(post).toHaveBeenCalledTimes(1);

    await act(async () => resolve({ ok: false, error: { code: "pending_limit", limit: 3 } }));
    expect(submit().getAttribute("aria-disabled")).toBeNull();
  });

  it("shows a server field error on that field and focuses it", async () => {
    post.mockResolvedValue({ ok: false, error: { code: "invalid", fields: ["title"] } });
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    await waitFor(() => expect(screen.getByLabelText(/^Title/).getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByText("Add a title, up to 120 characters.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/^Title/));
  });

  it.each([
    ["pending_limit", { ok: false, error: { code: "pending_limit", limit: 3 } }],
    ["cross_origin", { ok: false, error: { code: "cross_origin" } }],
  ] as const)("shows a message for %s and keeps the input", async (_code, result) => {
    post.mockResolvedValue(result);
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    expect((await screen.findByRole("alert")).textContent?.length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
  });

  it("shows the general line and keeps the input when the request fails", async () => {
    post.mockRejectedValue(new Error("network"));
    render(<PostForm pendingCount={0} />);
    fillValid();
    fireEvent.click(submit());
    expect((await screen.findByRole("alert")).textContent).toBe("That didn't go through. Try again.");
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
  });
});

// Similar ideas while typing the title (#55).
const SIMILAR = [
  {
    number: 101,
    title: "Later dining hours on weekends",
    category: "dining" as const,
    status: "in_progress" as const,
  },
];

describe("PostForm, similar ideas (#55)", () => {
  it("lists a match for the picked board as the title is typed, and keeps the title on a board change", () => {
    render(<PostForm pendingCount={0} similarIdeas={SIMILAR} />);
    pickBoard();
    expect(screen.queryByText("Similar ideas already posted")).toBeNull();
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Later dining hours" } });
    expect(screen.getByRole("link", { name: /#101 Later dining hours on weekends/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Change board/ }));
    pickBoard(/^Green Initiatives/);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
    expect(screen.queryByRole("link", { name: /#101/ })).toBeNull();
  });

  it("shows nothing in edit mode", () => {
    render(<PostForm pendingCount={0} edit={edit} similarIdeas={SIMILAR} />);
    expect(screen.queryByText("Similar ideas already posted")).toBeNull();
  });
});

// Edit mode (#128): the same form, prefilled from a declined post, sent through
// resubmitIdea, with a withdraw section.
const IDEA_ID = "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10";
const EDIT_VALUES = {
  title: "Later dining hours",
  summary: "Open until midnight.",
  details: DETAILS,
  category: "dining",
  location: "",
  scale: "",
  costBand: "",
  timeHorizon: "",
  anonymous: false,
};
const edit = { ideaId: IDEA_ID, values: EDIT_VALUES };
const resend = () => screen.getByRole("button", { name: "Send for review again" });
const editForm = () => screen.getByRole("form", { name: "Edit your post" });

describe("PostForm, edit mode (#128)", () => {
  it("opens prefilled with the board picked, and leaves focus off the title", () => {
    render(<PostForm pendingCount={0} edit={edit} />);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
    expect((screen.getByLabelText(/^Short description/) as HTMLTextAreaElement).value).toBe(
      "Open until midnight.",
    );
    expect(editForm().getAttribute("data-board")).toBe("dining");
    expect(document.activeElement).not.toBe(screen.getByLabelText(/^Title/));
    expect(screen.queryByRole("button", { name: "Post idea" })).toBeNull();
  });

  it("draws the form on the page, with no white panel", () => {
    render(<PostForm pendingCount={0} edit={edit} />);
    expect(editForm().className).not.toMatch(/bg-surface|bordered|\bp-/);
  });

  it("resubmits once with the id and the parsed fields, and never posts", async () => {
    resubmit.mockResolvedValue({ ok: true, id: IDEA_ID, version: 2 });
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Dining open until midnight" } });
    fireEvent.click(resend());
    await screen.findByText("Sent for review again");
    const expected = parsePostIdea({
      title: "Dining open until midnight",
      summary: "Open until midnight.",
      details: DETAILS,
      category: "dining",
      location: "",
      scale: undefined,
      costBand: undefined,
      timeHorizon: undefined,
      anonymous: false,
    });
    expect(expected.success).toBe(true);
    expect(resubmit).toHaveBeenCalledTimes(1);
    expect(resubmit).toHaveBeenCalledWith({ ...expected.data, ideaId: IDEA_ID });
    expect(post).not.toHaveBeenCalled();
  });

  it("calls nothing for an invalid form", () => {
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "" } });
    fireEvent.click(resend());
    expect(resubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Title/).getAttribute("aria-invalid")).toBe("true");
  });

  it("moves focus to Sent for review again, with a way back and no Post another idea", async () => {
    resubmit.mockResolvedValue({ ok: true, id: IDEA_ID, version: 2 });
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.click(resend());
    const heading = await screen.findByText("Sent for review again");
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByLabelText(/^Title/)).toBeNull();
    expect(screen.getByRole("link", { name: "Back to my ideas" }).getAttribute("href")).toBe("/me");
    expect(screen.queryByRole("button", { name: "Post another idea" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Withdraw post" })).toBeNull();
  });

  it.each([
    ["already_changed", { code: "already_changed" }, /This post changed while you were editing/],
    [
      "invalid_transition",
      { code: "invalid_transition", from: "pending", event: "resubmit" },
      /This post changed while you were editing/,
    ],
    ["not_editable", { code: "not_editable" }, /This post changed while you were editing/],
    ["not_found", { code: "not_found" }, /We could not find this post/],
    ["pending_limit", { code: "pending_limit", limit: 3 }, /You have 3 posts waiting for review/],
    ["cross_origin", { code: "cross_origin" }, /That didn't go through\. Try again\./],
  ] as const)("shows the line for %s and keeps the input", async (_code, error, line) => {
    resubmit.mockResolvedValue({ ok: false, error } as Awaited<ReturnType<typeof resubmitIdea>>);
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.click(resend());
    expect((await screen.findByRole("alert")).textContent).toMatch(line);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
  });

  it("signed out: keeps a draft scoped to the idea, and links back to the edit page", async () => {
    resubmit.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "My new title" } });
    fireEvent.click(resend());
    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe(
      `/sign-in?next=${encodeURIComponent(`/me/ideas/${IDEA_ID}/edit`)}`,
    );
    expect(screen.getByText(/Sign in again to send your changes/)).toBeTruthy();
    expect(loadDraft(IDEA_ID)?.title).toBe("My new title");
    expect(loadDraft()).toBeNull();
  });

  it("restores a kept draft over the server values, and clears it", async () => {
    saveDraft({ ...EDIT_VALUES, title: "Kept before sign-in" }, IDEA_ID);
    render(<PostForm pendingCount={0} edit={edit} />);
    await waitFor(() =>
      expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Kept before sign-in"),
    );
    expect(loadDraft(IDEA_ID)).toBeNull();
  });

  it("does not pick up the draft of a new post", async () => {
    saveDraft({ ...EDIT_VALUES, title: "A different, new post" });
    render(<PostForm pendingCount={0} edit={edit} />);
    await act(async () => {});
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
    expect(loadDraft()?.title).toBe("A different, new post");
  });

  it("says a different board will review it when the board changes, and focuses the title once picked", () => {
    render(<PostForm pendingCount={0} edit={edit} />);
    expect(screen.queryByText(/A different board will review it/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    pickBoard(/^Green Initiatives/);
    expect(screen.getByText("A different board will review it: Green Initiatives.")).toBeTruthy();
    expect(editForm().getAttribute("data-board")).toBe("green");
    expect(document.activeElement).toBe(screen.getByLabelText(/^Title/));
  });

  it("at the limit, disables the fields and says why, and Withdraw still works", () => {
    render(<PostForm pendingCount={3} edit={edit} />);
    expect(screen.getByText(RESUBMIT_LIMIT_REASON)).toBeTruthy();
    expect(screen.queryByText(PENDING_LIMIT_REASON)).toBeNull();
    expect(screen.getByText(pendingPostsText(3))).toBeTruthy();
    expect(screen.getByLabelText(/^Title/).matches(":disabled")).toBe(true);
    expect(resend().getAttribute("aria-disabled")).toBe("true");
    const button = screen.getByRole("button", { name: "Withdraw post" });
    expect(button.matches(":disabled")).toBe(false);
    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: "Withdraw this post?" })).toBeTruthy();
  });

  it("has no Withdraw section outside edit mode", () => {
    render(<PostForm pendingCount={0} />);
    pickBoard();
    expect(screen.queryByRole("button", { name: "Withdraw post" })).toBeNull();
    expect(document.getElementById("withdraw")).toBeNull();
  });

  it("opens the dialog from Withdraw, closes it with Keep it, and sends nothing", async () => {
    render(<PostForm pendingCount={0} edit={edit} />);
    expect(document.getElementById("withdraw")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw post" }));
    const dialog = screen.getByRole("dialog", { name: "Withdraw this post?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("confirming withdraws once and shows Post withdrawn with focus on it", async () => {
    withdraw.mockResolvedValue({ ok: true, id: IDEA_ID });
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw post" }));
    const dialog = screen.getByRole("dialog", { name: "Withdraw this post?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Withdraw post" }));
    const heading = await screen.findByText("Post withdrawn");
    expect(withdraw).toHaveBeenCalledTimes(1);
    expect(withdraw).toHaveBeenCalledWith({ ideaId: IDEA_ID });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.queryByLabelText(/^Title/)).toBeNull();
    expect(screen.getByRole("link", { name: "Back to my ideas" }).getAttribute("href")).toBe("/me");
    expect(screen.getByRole("link", { name: "Post an idea" }).getAttribute("href")).toBe("/post");
    expect(resubmit).not.toHaveBeenCalled();
  });

  it("shows a refused withdrawal inside the dialog and keeps the form", async () => {
    withdraw.mockResolvedValue({ ok: false, error: { code: "already_changed" } });
    render(<PostForm pendingCount={0} edit={edit} />);
    fireEvent.click(screen.getByRole("button", { name: "Withdraw post" }));
    const dialog = screen.getByRole("dialog", { name: "Withdraw this post?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Withdraw post" }));
    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/This post changed/);
    expect(screen.queryByText("Post withdrawn")).toBeNull();
  });

  it("focuses the Withdraw button when the page opens at #withdraw", () => {
    window.location.hash = "#withdraw";
    render(<PostForm pendingCount={0} edit={edit} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Withdraw post" }));
  });

  it("says nothing that promises action", () => {
    render(<PostForm pendingCount={0} edit={edit} />);
    expect(document.body.textContent).not.toMatch(/petition|will be approved|will be built|we will/i);
  });
});

// Edit mode for an approved post (#295): sent through editIdea, never blocked by the
// pending limit, with no withdraw and no pending count.
describe("PostForm, editing an approved post (#295)", () => {
  const approvedEdit = { ...edit, mode: "edit" as const, number: 142 };
  const sendChanges = () => screen.getByRole("button", { name: "Send changes for review" });

  it("sends through editIdea with the id, and never posts or resubmits", async () => {
    editApproved.mockResolvedValue({ ok: true, id: IDEA_ID, version: 2 });
    render(<PostForm pendingCount={0} edit={approvedEdit} />);
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Later dining hours, every day" } });
    fireEvent.click(sendChanges());
    await waitFor(() => expect(editApproved).toHaveBeenCalledTimes(1));
    expect(editApproved).toHaveBeenCalledWith(
      expect.objectContaining({ ideaId: IDEA_ID, title: "Later dining hours, every day" }),
    );
    expect(post).not.toHaveBeenCalled();
    expect(resubmit).not.toHaveBeenCalled();
  });

  it("confirms with its own words, and links back to my ideas and to the idea", async () => {
    editApproved.mockResolvedValue({ ok: true, id: IDEA_ID, version: 2 });
    render(<PostForm pendingCount={0} edit={approvedEdit} />);
    fireEvent.click(sendChanges());
    expect(await screen.findByRole("heading", { name: "Changes sent for review" })).toBeTruthy();
    expect(
      screen.getByText(
        "Students still see the approved version. A reviewer usually checks changes within 2 to 3 days.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to my ideas" }).getAttribute("href")).toBe("/me");
    expect(screen.getByRole("link", { name: "See the idea" }).getAttribute("href")).toBe("/ideas/142");
  });

  it("has no withdraw section, no pending count, and is not blocked at the limit", () => {
    render(<PostForm pendingCount={3} edit={approvedEdit} />);
    expect(screen.queryByRole("button", { name: "Withdraw post" })).toBeNull();
    expect(screen.queryByText(/pending post/)).toBeNull();
    expect(screen.queryByText(RESUBMIT_LIMIT_REASON)).toBeNull();
    expect(sendChanges().getAttribute("aria-disabled")).toBeNull();
  });

  it("notes that every change is reviewed", () => {
    render(<PostForm pendingCount={0} edit={approvedEdit} />);
    expect(screen.getByText(/Every change is reviewed before it shows\./)).toBeTruthy();
  });

  it("says a category change moves the board, and that only the VP can approve a move", () => {
    render(<PostForm pendingCount={0} edit={approvedEdit} />);
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    pickBoard(/^Campus Services/);
    expect(
      screen.getByText(
        "This moves your idea to another board: Campus Services. Only the VP of Campus Affairs can approve a move.",
      ),
    ).toBeTruthy();
  });

  it.each([
    ["edit_pending", /You already sent changes to this post/],
    ["no_changes", /You have not changed anything yet\./],
    ["not_approved", /This post changed while you were editing/],
  ] as const)("shows the line for %s and keeps the input", async (code, line) => {
    editApproved.mockResolvedValue({ ok: false, error: { code } } as Awaited<ReturnType<typeof editIdea>>);
    render(<PostForm pendingCount={0} edit={approvedEdit} />);
    fireEvent.click(sendChanges());
    expect((await screen.findByRole("alert")).textContent).toMatch(line);
    expect((screen.getByLabelText(/^Title/) as HTMLInputElement).value).toBe("Later dining hours");
  });

  it("signed out: keeps a draft for the idea and links back to the edit page", async () => {
    editApproved.mockResolvedValue({ ok: false, error: { code: "signed_out" } } as Awaited<
      ReturnType<typeof editIdea>
    >);
    render(<PostForm pendingCount={0} edit={approvedEdit} />);
    fireEvent.click(sendChanges());
    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe(
      `/sign-in?next=${encodeURIComponent(`/me/ideas/${IDEA_ID}/edit`)}`,
    );
    expect(loadDraft(IDEA_ID)).not.toBeNull();
  });
});
