import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UpdatesView } from "./UpdatesView";
import { sampleUpdateRows } from "./sample";

afterEach(cleanup);

const ALL_BOARDS = [
  { value: "DAB" as const, label: "Dining" },
  { value: "CPAB" as const, label: "Campus Planning" },
  { value: "CSC" as const, label: "Campus Services" },
  { value: "GIB" as const, label: "Green Initiatives" },
  { value: "SC" as const, label: "Sustainability" },
];

// jsdom has no ResizeObserver; the panel centers itself with one in the browser (#130).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// The Updates tab (#130): due ideas first, a click on an idea's title opens its panel, and
// the last-update line opens the past updates. Clicking a title is the only way to post.
describe("Updates tab", () => {
  it("lists the ideas in progress with the due ones first", () => {
    render(<UpdatesView rows={sampleUpdateRows()} boards={ALL_BOARDS} />);
    const titles = screen.getAllByRole("button", { pressed: undefined }).map((b) => b.textContent);
    expect(titles.indexOf("Free print credits each semester")).toBeLessThan(
      titles.indexOf("Refill stations on every floor"),
    );
  });

  it("opens the update panel from the idea's title, beside the list", () => {
    render(<UpdatesView rows={sampleUpdateRows()} boards={ALL_BOARDS} />);
    expect(screen.queryByText(/New update on/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refill stations on every floor" }));
    expect(screen.getByText("New update on Refill stations on every floor")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to idea" }).getAttribute("href")).toBe("/ideas/131");
  });

  it("shows only the due ideas under Due for an update", () => {
    render(<UpdatesView rows={sampleUpdateRows()} boards={ALL_BOARDS} />);
    fireEvent.click(screen.getByRole("button", { name: "Due for an update" }));
    expect(screen.queryByRole("button", { name: "Refill stations on every floor" })).toBeNull();
    expect(screen.getByRole("button", { name: "Free print credits each semester" })).toBeTruthy();
  });

  it("shows past updates from the last-update line, and only there", () => {
    render(<UpdatesView rows={sampleUpdateRows()} boards={ALL_BOARDS} />);
    const row = screen.getByRole("button", { name: /Last update: Still working, no news/ }).closest("li")!;
    const past = row.querySelector(".updates-collapse")!;
    expect(past.getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Last update: Still working, no news/ }));
    expect(past.getAttribute("data-open")).toBe("true");
    expect(screen.getByText("60 days ago: Met with dining services.")).toBeTruthy();
  });

  it("filters by board, and a chair with one board gets that board only", () => {
    const { unmount } = render(<UpdatesView rows={sampleUpdateRows()} boards={ALL_BOARDS} />);
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "GIB" } });
    expect(screen.getByRole("button", { name: "Refill stations on every floor" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Later dining hours on Sundays" })).toBeNull();
    unmount();
    render(<UpdatesView rows={sampleUpdateRows()} boards={[ALL_BOARDS[0]!]} />);
    expect((screen.getByLabelText("Board") as HTMLSelectElement).disabled).toBe(true);
  });

  it("sorts by the ideas page's options, due first by default", () => {
    render(<UpdatesView rows={sampleUpdateRows()} boards={ALL_BOARDS} />);
    const sort = screen.getByLabelText("Sort by") as HTMLSelectElement;
    expect(sort.value).toBe("due");
    fireEvent.change(sort, { target: { value: "support" } });
    const titles = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const first = titles.findIndex((t) => t.includes("Later dining hours"));
    const second = titles.findIndex((t) => t.includes("Vegetarian options"));
    expect(second).toBeLessThan(first);
  });
});
