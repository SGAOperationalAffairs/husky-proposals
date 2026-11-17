import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function renderView(initialIdea = "all", list = rows) {
  return render(<PeopleView rows={list} boards={boards} now={NOW} initialIdea={initialIdea} />);
}

describe("PeopleView", () => {
  it("opens on To contact, with the overdue row first and a text count on each filter", () => {
    renderView();
    const items = screen.getAllByRole("checkbox");
    expect(items.map((c) => c.getAttribute("aria-label"))).toEqual(["Select Ava Chen", "Select Priya Nair"]);
    expect(screen.getByRole("button", { name: /To contact\s*2/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Joined\s*1/ })).toBeTruthy();
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

  it("shows a bar for the picked rows, and Joined saves them", async () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Joined" }));
    await waitFor(() => expect(calls).toContainEqual({ userId: "u1", ideaId: "i1", status: "joined" }));
  });

  it("Message stays disabled until email is built", () => {
    renderView();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ava Chen" }));
    expect((screen.getByRole("button", { name: /Message selected/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("shows the empty line when a filter has nobody", () => {
    renderView("all", []);
    expect(screen.getByText(/Nobody here/)).toBeTruthy();
  });
});
