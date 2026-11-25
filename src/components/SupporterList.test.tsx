import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SupporterList } from "./SupporterList";

afterEach(cleanup);

const people = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ name: `Person ${i + 1}`, email: `person${i + 1}@example.com` }));

describe("who supported, in the leader panel (#100)", () => {
  it("shows the heading, the privacy line, and one row per supporter with name and email", () => {
    render(<SupporterList supporters={people(2)} />);
    expect(screen.getByRole("heading", { name: "Who supported" })).toBeTruthy();
    expect(
      screen.getByText(
        "2 students. Only SGA's Executive Board and this board's chair or director see these names.",
      ),
    ).toBeTruthy();
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual(["Person 1, person1@example.com", "Person 2, person2@example.com"]);
  });

  it("says 1 student for a single supporter", () => {
    render(<SupporterList supporters={people(1)} />);
    expect(screen.getByText(/^1 student\. Only SGA's Executive Board/)).toBeTruthy();
  });

  it("shows emails as plain text, never as mailto links", () => {
    render(<SupporterList supporters={people(2)} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows exactly ten rows with no overflow at ten", () => {
    const { container } = render(<SupporterList supporters={people(10)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(container.querySelector("details")).toBeNull();
  });

  it("puts the rest inside a details element after the first ten", () => {
    const { container } = render(<SupporterList supporters={people(13)} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(within(details!).getByText("Show all 13")).toBeTruthy();
    expect(within(details!).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")).toHaveLength(13);
    expect(
      screen.getByText(
        "13 students. Only SGA's Executive Board and this board's chair or director see these names.",
      ),
    ).toBeTruthy();
  });

  it("says no one has supported yet when the list is empty", () => {
    render(<SupporterList supporters={[]} />);
    expect(screen.getByRole("heading", { name: "Who supported" })).toBeTruthy();
    expect(screen.getByText("No one has supported this idea yet.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
