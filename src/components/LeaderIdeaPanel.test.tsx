import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LeaderIdeaPanel } from "./LeaderIdeaPanel";

afterEach(cleanup);

const named = { kind: "named", name: "Maya Test", email: "maya.test@example.com" } as const;
const takeDown = <button type="button">Take down</button>;
const status = <button type="button">Start working on this</button>;

describe("leader panel on the idea page (#59)", () => {
  it("shows the poster, the reviewer tag, and take down for a reviewer", () => {
    render(
      <LeaderIdeaPanel
        poster={named}
        reviewerLabel="You review Dining"
        mayManageStatus={false}
        mayTakeDown={true}
        takeDown={takeDown}
      />,
    );
    expect(screen.getByRole("heading", { name: "For SGA leaders" })).toBeTruthy();
    expect(screen.getByText("You review Dining")).toBeTruthy();
    expect(screen.getByText("Posted by Maya Test, maya.test@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Take down" })).toBeTruthy();
  });

  it("has no take down when the viewer may not, and no tag without a label", () => {
    render(
      <LeaderIdeaPanel
        poster={named}
        reviewerLabel={null}
        mayManageStatus={false}
        mayTakeDown={false}
        takeDown={takeDown}
      />,
    );
    expect(screen.queryByRole("button", { name: "Take down" })).toBeNull();
    expect(screen.queryByText(/You review/)).toBeNull();
  });

  it("says who posted for each kind", () => {
    const { rerender } = render(
      <LeaderIdeaPanel
        poster={{ kind: "anonymous_visible", name: "Maya Test", email: "maya.test@example.com" }}
        reviewerLabel={null}
        mayManageStatus={false}
        mayTakeDown={false}
      />,
    );
    expect(screen.getByText("Anonymous to students")).toBeTruthy();
    rerender(
      <LeaderIdeaPanel
        poster={{ kind: "anonymous_hidden" }}
        reviewerLabel={null}
        mayManageStatus={false}
        mayTakeDown={false}
      />,
    );
    expect(screen.getByText(/You can.t see who posted it/)).toBeTruthy();
    expect(screen.queryByText(/Maya/)).toBeNull();
    rerender(
      <LeaderIdeaPanel
        poster={{ kind: "deleted" }}
        reviewerLabel={null}
        mayManageStatus={false}
        mayTakeDown={false}
      />,
    );
    expect(screen.getByText("Posted by a student whose account was deleted.")).toBeTruthy();
  });
});

describe("leader panel status slot (#98)", () => {
  it("shows the status actions only when the viewer may manage status", () => {
    const { rerender } = render(
      <LeaderIdeaPanel
        poster={named}
        reviewerLabel={null}
        mayManageStatus={true}
        mayTakeDown={false}
        status={status}
      />,
    );
    expect(screen.getByRole("button", { name: "Start working on this" })).toBeTruthy();
    rerender(
      <LeaderIdeaPanel
        poster={named}
        reviewerLabel={null}
        mayManageStatus={false}
        mayTakeDown={false}
        status={status}
      />,
    );
    expect(screen.queryByRole("button", { name: "Start working on this" })).toBeNull();
  });

  it("puts the status actions above take down", () => {
    render(
      <LeaderIdeaPanel
        poster={named}
        reviewerLabel={null}
        mayManageStatus={true}
        mayTakeDown={true}
        status={status}
        takeDown={takeDown}
      />,
    );
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons).toEqual(["Start working on this", "Take down"]);
  });
});
