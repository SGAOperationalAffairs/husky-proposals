import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs } from "./Tabs";

afterEach(cleanup);

const TABS = [
  { id: "review", label: "To review", count: 2 },
  { id: "queue", label: "Queue" },
  { id: "people", label: "People" },
];

describe("tabs (#231)", () => {
  it("keeps the border on the tablist, inside a sideways scroller", () => {
    render(<Tabs label="Sections" tabs={TABS} selected="queue" />);
    const list = screen.getByRole("tablist");
    expect(list.classList.contains("border-b")).toBe(true);
    expect(list.classList.contains("min-w-full")).toBe(true);
    expect(list.classList.contains("overflow-x-auto")).toBe(false);
    const scroller = list.parentElement;
    expect(scroller?.classList.contains("overflow-x-auto")).toBe(true);
    expect(scroller?.classList.contains("overflow-y-hidden")).toBe(true);
  });

  it("renders every tab straight inside the tablist and marks the selected one", () => {
    render(<Tabs label="Sections" tabs={TABS} selected="queue" />);
    const list = screen.getByRole("tablist");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) expect(tab.parentElement).toBe(list);
    expect(screen.getByRole("tab", { name: "Queue" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "People" }).getAttribute("aria-selected")).toBe("false");
  });
});
