import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IdeaFilters } from "./IdeaFilters";

afterEach(cleanup);

const SORTS = [{ value: "newest", label: "Newest" }];
const STATUSES = [{ value: "waiting", label: "On hold" }];

describe("ideas filters (#61)", () => {
  it("puts the status and sort after the search field, and the board chips last", () => {
    render(
      <IdeaFilters
        action="/"
        sort="newest"
        statuses={STATUSES}
        sorts={SORTS}
        boards={<nav aria-label="Boards">chips</nav>}
        onChange={() => {}}
      />,
    );
    const search = screen.getByRole("searchbox", { name: "Search" });
    const boards = screen.getByRole("navigation", { name: "Boards" });
    const status = screen.getByLabelText("Status");
    const sort = screen.getByLabelText("Sort by");
    const after = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(after(search, status)).toBe(true);
    expect(after(status, sort)).toBe(true);
    expect(after(sort, boards)).toBe(true);
  });

  it("puts the view switch on the board row, to the right of the chips", () => {
    render(
      <IdeaFilters
        action="/"
        sort="newest"
        sorts={SORTS}
        boards={<nav aria-label="Boards">chips</nav>}
        viewSwitch={<nav aria-label="View">switch</nav>}
        onChange={() => {}}
      />,
    );
    const boards = screen.getByRole("navigation", { name: "Boards" });
    const view = screen.getByRole("navigation", { name: "View" });
    expect(boards.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(boards.parentElement).toBe(view.parentElement);
  });

  it("draws its dropdowns on the page color, not a white surface (#61)", () => {
    render(<IdeaFilters action="/" sort="newest" statuses={STATUSES} sorts={SORTS} onChange={() => {}} />);
    for (const label of ["Status", "Sort by"]) {
      const select = screen.getByLabelText(label);
      expect(select.className).toMatch(/bg-bg/);
      expect(select.className).not.toMatch(/bg-surface/);
    }
  });
});
