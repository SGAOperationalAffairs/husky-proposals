import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PersonRow } from "@/core/people";

// The People list (#129): the default look, with real rows. The server action is mocked, since the
// rules have their own tests in setContactStatus.test.ts.
const calls: unknown[] = [];
vi.mock("./actions", () => ({
  setContactStatusAction: (raw: unknown) => {
    calls.push(raw);
    return Promise.resolve({ ok: true } as const);
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import { ToastProvider } from "@/components/Toast";
import { PeopleView } from "./PeopleView";

afterEach(() => {
  cleanup();
  calls.length = 0;
});

const NOW = "2026-11-20T12:00:00Z";
const DAY = 24 * 60 * 60 * 1000;
const base = { ideaId: "i1", ideaNumber: 103, ideaTitle: "Later dining hours", board: "DAB" as const };

const rows: PersonRow[] = [
  {
    ...base,
    userId: "u1",
    name: "Ava Chen",
    email: "ava@husky.example",
    contactStatus: "new",
    signedUpAt: new Date(Date.parse(NOW) - 6 * DAY),
    contactedAt: null,
  },
  {
    ...base,
    userId: "u2",
    name: "Marcus Bell",
    email: "marcus@husky.example",
    contactStatus: "joined",
    signedUpAt: new Date(Date.parse(NOW) - DAY),
    contactedAt: null,
  },
  {
    ...base,
    ideaId: "i2",
    ideaNumber: 118,
    ideaTitle: "Bike racks",
    board: "CPAB",
    userId: "u3",
    name: "Priya Nair",
    email: "priya@husky.example",
    contactStatus: "new",
    signedUpAt: new Date(Date.parse(NOW) - DAY),
    contactedAt: null,
  },
];

const boards = [
  { value: "DAB" as const, label: "Dining Advisory Board" },
  { value: "CPAB" as const, label: "Campus Planning Advisory Board" },
];

// The bar's copy fallback calls useToast, so the view renders inside the provider, as in layout.tsx.
function renderView(initialIdea = "all", list = rows) {
  return render(
    <ToastProvider>
      <PeopleView rows={list} boards={boards} now={NOW} initialIdea={initialIdea} />
    </ToastProvider>,
  );
}

const INTERIM_LINE = "Opens your own email app. Replies go to you, not the SGA inbox.";

describe("PeopleView", () => {
  it("opens on To contact, with the overdue row first and the list line says what it shows", () => {
    renderView();
    const items = screen.getAllByRole("checkbox");
    expect(items.map((c) => c.getAttribute("aria-label"))).toEqual(["Select Ava Chen", "Select Priya Nair"]);
    expect(screen.getByText("2 to contact")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Joined" })).toBeTruthy();
    expect(screen.getByText("3 days overdue")).toBeTruthy();
    expect(screen.getByText("Contact in 2 days")).toBeTruthy();
  });

  it("shows the email only after a name is opened, one at a time", () => {
    renderView();
    const name = screen.getByRole("button", { name: "Ava Chen" });
    expect(screen.queryByText("ava@husky.example")).toBeNull();
    fireEvent.click(name);
    expect(screen.getByText("ava@husky.example")).toBeTruthy();
    expect(name.getAttribute("aria-expanded")).toBe("true");
  });

  it("opens on the idea named in the link, and narrows the list to it", () => {
    renderView("118");
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))).toEqual([
      "Select Priya Nair",
    ]);
  });

  it("shows a bar for the picked rows", () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
  });

  it("asks before marking, and says what the change does", () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark joined" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Mark 1 person as joined?")).toBeTruthy();
    expect(within(dialog).getByText(/They move to the Joined list/)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("Cancel saves nothing", () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark joined" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(calls).toEqual([]);
  });

  it("confirming Mark joined saves the picked volunteer", async () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark joined" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark joined" }));
    await waitFor(() => expect(calls).toContainEqual({ userId: "u1", ideaId: "i1", status: "joined" }));
  });

  it("confirming Mark to contact moves the picked volunteer back", async () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark to contact" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark to contact" }));
    await waitFor(() => expect(calls).toContainEqual({ userId: "u1", ideaId: "i1", status: "new" }));
  });

  it("Select all ticks every shown row, and the button then reads Deselect all", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByText("2 selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Deselect all" }));
    expect(screen.queryByText("2 selected")).toBeNull();
  });

  it("changing a filter drops the picks, so they cannot be saved out of sight", () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Joined/ }));
    expect(screen.queryByText("1 selected")).toBeNull();
  });

  it("a picked row that leaves the list on a refresh is not counted or saved (#238)", async () => {
    const view = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByText("2 selected")).toBeTruthy();
    // Another leader marks Ava joined, and the refresh delivers it. Her row leaves To contact.
    const refreshed = rows.map((r) => (r.userId === "u1" ? { ...r, contactStatus: "joined" as const } : r));
    view.rerender(
      <ToastProvider>
        <PeopleView rows={refreshed} boards={boards} now={NOW} initialIdea="all" />
      </ToastProvider>,
    );
    expect(screen.getByText("1 selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mark joined" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Mark 1 person as joined?")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark joined" }));
    await waitFor(() => expect(calls).toEqual([{ userId: "u3", ideaId: "i2", status: "joined" }]));
  });

  it("switching the board resets the idea and drops the picks (#238)", async () => {
    renderView("103");
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))).toEqual([
      "Select Ava Chen",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Board" }));
    const option = await screen.findByRole("option", { name: "Campus Planning Advisory Board" });
    // Base UI picks an item on the pointer's release, and ignores a click that lands right after
    // the list opens, so the test waits a beat and sends the whole pointer sequence.
    await new Promise((resolve) => setTimeout(resolve, 300));
    fireEvent.pointerDown(option);
    fireEvent.mouseDown(option);
    fireEvent.pointerUp(option);
    fireEvent.mouseUp(option);
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByText("1 selected")).toBeNull());
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))).toEqual([
      "Select Priya Nair",
    ]);
    expect(screen.queryByDisplayValue(/#103/)).toBeNull();
  });

  it("Message selected is a mailto link with the picked people in BCC and nobody in To (#243)", () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Priya Nair" }));
    const link = screen.getByRole("link", { name: /Message selected/ });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("");
    expect(url.searchParams.get("bcc")).toBe("ava@husky.example,priya@husky.example");
    expect(url.searchParams.has("subject")).toBe(false);
    expect(screen.getByText(INTERIM_LINE)).toBeTruthy();
    expect(link.getAttribute("aria-describedby")).toBe(screen.getByText(INTERIM_LINE).id);
  });

  it("shows no Message selected with nothing picked (#243)", () => {
    renderView();
    expect(screen.queryByText(/Message selected/)).toBeNull();
    expect(screen.queryByText(INTERIM_LINE)).toBeNull();
  });

  it("a picked row that a refresh hides is not mailed (#243, #238)", () => {
    const view = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    const refreshed = rows.map((r) => (r.userId === "u1" ? { ...r, contactStatus: "joined" as const } : r));
    view.rerender(
      <ToastProvider>
        <PeopleView rows={refreshed} boards={boards} now={NOW} initialIdea="all" />
      </ToastProvider>,
    );
    const link = screen.getByRole("link", { name: /Message selected/ });
    expect(new URL(link.getAttribute("href") ?? "").searchParams.get("bcc")).toBe("priya@husky.example");
  });

  it("past the link limit it offers Copy addresses and the notice, not a link or the interim line (#243)", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const many: PersonRow[] = Array.from({ length: 120 }, (_, i) => ({
      ...base,
      userId: `v${i}`,
      name: `Volunteer ${i}`,
      email: `volunteer${String(i).padStart(3, "0")}@husky.example`,
      contactStatus: "new" as const,
      signedUpAt: new Date(Date.parse(NOW) - DAY),
      contactedAt: null,
    }));
    renderView("all", many);
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(
      screen.getByText("Too many people for one email link. Copy the addresses and paste them into BCC."),
    ).toBeTruthy();
    expect(screen.queryByText(INTERIM_LINE)).toBeNull();
    expect(screen.queryByRole("link", { name: /Message selected/ })).toBeNull();
    expect(document.querySelector('a[href^="mailto:?bcc"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Copy addresses" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(many.map((r) => r.email).join("; "));
  });

  it("shows the empty line when a filter has nobody", () => {
    renderView("all", []);
    expect(screen.getByText(/Nobody here/)).toBeTruthy();
  });
});
