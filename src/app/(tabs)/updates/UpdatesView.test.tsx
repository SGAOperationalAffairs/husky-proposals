import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toUpdateRow } from "@/app/_updates/present";
import type { UpdatableIdea } from "@/db/updatesList";

const postUpdateAction = vi.fn();
const refresh = vi.fn();
const toast = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/app/_updates/actions", () => ({ postUpdateAction: (arg: unknown) => postUpdateAction(arg) }));

import { UpdatesView } from "./UpdatesView";
import { sampleUpdateRows } from "./sample";

const NOW = new Date("2026-12-01T15:00:00.000Z");
const ALL_BOARDS = [
  { value: "DAB" as const, label: "Dining" },
  { value: "CPAB" as const, label: "Campus Planning" },
  { value: "CSC" as const, label: "Campus Services" },
  { value: "GIB" as const, label: "Green Initiatives" },
  { value: "SC" as const, label: "Sustainability" },
];

const rowsFrom = (records: UpdatableIdea[]) => records.map((r) => toUpdateRow(r, NOW));
const sampleRows = () => rowsFrom(sampleUpdateRows(NOW));

// jsdom has no ResizeObserver; the panel centers itself with one in the browser (#130).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

beforeEach(() => {
  for (const fn of [postUpdateAction, refresh, toast]) fn.mockReset();
});
afterEach(cleanup);

const titleButton = (name: string) => screen.getByRole("button", { name });
const rowOf = (title: string) => titleButton(title).closest("li")!;
const shownTitles = () =>
  Array.from(document.querySelectorAll("li[data-board]")).map(
    (li) => li.querySelector("button[aria-pressed]")!.textContent,
  );

const DINING = "Later dining hours on Sundays";
const REFILL = "Refill stations on every floor";

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

// The Updates tab (#130): due ideas first, a click on an idea's title opens its panel, and
// posting goes through the one hook.
describe("Updates tab", () => {
  it("lists the ideas with the one due longest first", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    const titles = shownTitles();
    // #142 is 10 days overdue, #103 is 4, #171 is 3; the rest are not due yet.
    expect(titles.slice(0, 3)).toEqual([
      "Vegetarian options at every station in the dining hall",
      DINING,
      "Free menstrual products in every restroom on campus",
    ]);
    expect(titles).toHaveLength(9);
  });

  it("flags an idea past its cadence with the days overdue in words, and shows days left otherwise", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    expect(within(rowOf(DINING)).getByText("4 days overdue")).toBeTruthy();
    expect(within(rowOf(REFILL)).getByText("Due in 26 days")).toBeTruthy();
  });

  it("the last-update line says how long ago, or that there are none", () => {
    render(
      <UpdatesView
        rows={rowsFrom([
          { ...sampleUpdateRows(NOW)[0]!, id: "00000000-0000-4000-8000-000000000999", updates: [] },
          ...sampleUpdateRows(NOW).slice(0, 1),
        ])}
        boards={ALL_BOARDS}
      />,
    );
    expect(screen.getByText("No updates yet")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Last update, 34 days ago: Still working, no news\./ }),
    ).toBeTruthy();
  });

  it("opens the update panel from the idea's title, beside the list, and moves focus to its heading", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    expect(screen.queryByText(/New update on/)).toBeNull();
    fireEvent.click(titleButton(REFILL));
    const heading = screen.getByRole("heading", { name: `New update on ${REFILL}` });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole("link", { name: "Go to idea" }).getAttribute("href")).toBe("/ideas/131");
  });

  it("Escape and Close shut the panel and put focus back on the idea's title", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(REFILL));
    fireEvent.keyDown(screen.getByRole("heading", { name: /New update on/ }), { key: "Escape" });
    expect(screen.queryByText(/New update on/)).toBeNull();
    expect(document.activeElement).toBe(titleButton(REFILL));

    fireEvent.click(titleButton(DINING));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(/New update on/)).toBeNull();
    expect(document.activeElement).toBe(titleButton(DINING));
  });

  it("the preview shows the draft as Today above the idea's past updates", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    const list = within(screen.getByRole("complementary", { name: "Update" })).getByRole("list", {
      name: "Updates",
    });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "TodayThe board has formed a committee to work on this. We will share the first meeting date soon.",
      "34 days agoStill working, no news.",
      "60 days agoMet with dining services.",
    ]);
    expect(screen.getByText("What students see on the idea page")).toBeTruthy();
  });

  it("an empty draft shows a prompt instead of an empty Today line", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "custom" } });
    expect((screen.getByLabelText("What students will read") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByText("Your update appears here.")).toBeTruthy();
    expect(screen.queryByText(/^Today/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Start from"), { target: { value: "met" } });
    expect((screen.getByLabelText("What students will read") as HTMLTextAreaElement).value).toContain(
      "[add the steps]",
    );
  });

  it("says how many followers an update emails, and when it emails no one", () => {
    const base = sampleUpdateRows(NOW)[0]!;
    const records = [
      { ...base, id: "00000000-0000-4000-8000-000000000a01", title: "Zero followers", followerCount: 0 },
      { ...base, id: "00000000-0000-4000-8000-000000000a02", title: "One follower", followerCount: 1 },
      { ...base, id: "00000000-0000-4000-8000-000000000a03", title: "Many followers", followerCount: 31 },
    ];
    render(<UpdatesView rows={rowsFrom(records)} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton("Zero followers"));
    expect(screen.getByText("No one follows this idea yet, so no email goes out.")).toBeTruthy();
    fireEvent.click(titleButton("One follower"));
    expect(screen.getByText("Emails its 1 follower.")).toBeTruthy();
    fireEvent.click(titleButton("Many followers"));
    expect(screen.getByText("Emails its 31 followers.")).toBeTruthy();
  });

  it("posts the edited text, closes the panel, and returns focus to the title", async () => {
    postUpdateAction.mockResolvedValue({ ok: true, number: 103, kind: "board" });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    fireEvent.change(screen.getByLabelText("What students will read"), {
      target: { value: "The committee met on Tuesday." },
    });
    await click(screen.getByRole("button", { name: "Post update" }));
    expect(postUpdateAction).toHaveBeenCalledWith({
      ideaId: "00000000-0000-4000-8000-000000000103",
      kind: "board",
      body: "The committee met on Tuesday.",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Update posted on #103", board: "DAB" }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/New update on/)).toBeNull();
    expect(document.activeElement).toBe(titleButton(DINING));
  });

  it("Still working in the panel posts a check-in and closes it", async () => {
    postUpdateAction.mockResolvedValue({ ok: true, number: 103, kind: "check_in" });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    const panel = within(screen.getByRole("complementary", { name: "Update" }));
    await click(panel.getByRole("button", { name: "Still working, no news" }));
    expect(postUpdateAction).toHaveBeenCalledWith({
      ideaId: "00000000-0000-4000-8000-000000000103",
      kind: "check_in",
    });
    expect(screen.queryByText(/New update on/)).toBeNull();
  });

  it("an empty body shows its words on the field and sets aria-invalid, and the panel stays open", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "invalid", fields: ["body"] } });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    fireEvent.change(screen.getByLabelText("What students will read"), { target: { value: "" } });
    await click(screen.getByRole("button", { name: "Post update" }));
    const field = screen.getByLabelText("What students will read");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Write the update students will read, up to 1,000 characters.")).toBeTruthy();
    expect(screen.getByText(/New update on/)).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
    // Typing again clears the error.
    fireEvent.change(field, { target: { value: "Hello" } });
    expect(field.getAttribute("aria-invalid")).toBe("false");
  });

  it("a leftover placeholder says what to replace", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "body_placeholder" } });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    await click(screen.getByRole("button", { name: "Post update" }));
    expect(screen.getByText("Replace the parts in [brackets] before you post.")).toBeTruthy();
  });

  it("a refusal that is not about the text shows as an alert above the buttons", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "not_allowed" } });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    await click(screen.getByRole("button", { name: "Post update" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "Only this board's chair or director, or the VP, can post updates on its ideas.",
    );
  });

  it("busy buttons say Posting and are aria-disabled, and a second tap sends nothing", async () => {
    let finish: (value: unknown) => void = () => {};
    postUpdateAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    await click(screen.getByRole("button", { name: "Post update" }));
    const busy = screen.getByRole("button", { name: "Posting…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    expect(
      within(screen.getByRole("complementary", { name: "Update" }))
        .getByRole("button", { name: "Still working, no news" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    await click(busy);
    expect(postUpdateAction).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: false, error: { code: "not_allowed" } }));
  });

  it("only a due row has the Still working line, and tapping it posts a check-in and focuses the title", async () => {
    postUpdateAction.mockResolvedValue({ ok: true, number: 103, kind: "check_in" });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    expect(screen.getAllByRole("button", { name: "Still working, no news" })).toHaveLength(3);
    expect(within(rowOf(REFILL)).queryByRole("button", { name: "Still working, no news" })).toBeNull();

    await click(within(rowOf(DINING)).getByRole("button", { name: "Still working, no news" }));
    expect(postUpdateAction).toHaveBeenCalledWith({
      ideaId: "00000000-0000-4000-8000-000000000103",
      kind: "check_in",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Check-in posted on #103", board: "DAB" }),
    );
    expect(document.activeElement).toBe(titleButton(DINING));
  });

  it("a failed check-in shows its error on that row", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    await click(within(rowOf(DINING)).getByRole("button", { name: "Still working, no news" }));
    expect(within(rowOf(DINING)).getByRole("alert").textContent).toBe(
      "You're signed out. Sign in again to post an update.",
    );
  });

  it("an idea that leaves the list after a refresh still shows why", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "not_in_progress" } });
    const { rerender } = render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(titleButton(DINING));
    await click(screen.getByRole("button", { name: "Post update" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    rerender(<UpdatesView rows={sampleRows().filter((r) => r.title !== DINING)} boards={ALL_BOARDS} />);
    expect(screen.queryByText(/New update on/)).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(
      "This idea is no longer in progress. The list now shows where it stands.",
    );
  });

  it("shows only the due ideas under Due for an update", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: "Due for an update" }));
    expect(shownTitles()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: REFILL })).toBeNull();
    expect(screen.getByRole("button", { name: DINING })).toBeTruthy();
  });

  it("shows past updates from the last-update line, and only there", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    const row = rowOf(DINING);
    const past = row.querySelector(".updates-collapse")!;
    expect(past.getAttribute("data-open")).toBe("false");
    fireEvent.click(within(row).getByRole("button", { name: /Last update, 34 days ago/ }));
    expect(past.getAttribute("data-open")).toBe("true");
    expect(within(row).getByText("60 days ago: Met with dining services.")).toBeTruthy();
  });

  it("filters by board, and a chair with one board gets that board only", () => {
    const { unmount } = render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "GIB" } });
    expect(screen.getByRole("button", { name: REFILL })).toBeTruthy();
    expect(screen.queryByRole("button", { name: DINING })).toBeNull();
    unmount();
    render(<UpdatesView rows={sampleRows()} boards={[ALL_BOARDS[0]!]} />);
    expect((screen.getByLabelText("Board") as HTMLSelectElement).disabled).toBe(true);
  });

  it("sorts by the ideas page's options, due first by default", () => {
    render(<UpdatesView rows={sampleRows()} boards={ALL_BOARDS} />);
    const sort = screen.getByLabelText("Sort by") as HTMLSelectElement;
    expect(sort.value).toBe("due");
    fireEvent.change(sort, { target: { value: "support" } });
    expect(shownTitles()[0]).toBe("Free menstrual products in every restroom on campus");
    fireEvent.change(sort, { target: { value: "updated" } });
    expect(shownTitles()[0]).toBe("Compost bins in every residence hall lounge");
    fireEvent.change(sort, { target: { value: "newest" } });
    expect(shownTitles()[0]).toBe("Free menstrual products in every restroom on campus");
  });

  it("says so when nothing is in progress, nothing is due, or a board has none", () => {
    const { unmount } = render(<UpdatesView rows={[]} boards={ALL_BOARDS} />);
    expect(
      screen.getByText("No ideas in progress on your boards. When a board starts one, it shows here."),
    ).toBeTruthy();
    unmount();

    const notDue = rowsFrom(sampleUpdateRows(NOW).filter((r) => !r.isStale));
    const second = render(<UpdatesView rows={notDue} boards={ALL_BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: "Due for an update" }));
    expect(screen.getByText("Nothing is due. Every idea in progress has a recent update.")).toBeTruthy();
    second.unmount();

    render(<UpdatesView rows={sampleRows().filter((r) => r.board !== "SC")} boards={ALL_BOARDS} />);
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "SC" } });
    expect(screen.getByText("No ideas in progress on this board.")).toBeTruthy();
  });
});
