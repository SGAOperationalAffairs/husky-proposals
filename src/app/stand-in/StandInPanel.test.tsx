import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toSession } from "@/auth/contract";
import { STAND_IN_USERS, standInResponse } from "@/auth/standIn";
import { StandInPanel } from "./StandInPanel";

afterEach(cleanup);

function sessionFor(slug: string) {
  const result = toSession(standInResponse(slug, new Date("2026-10-31T12:00:00.000Z")));
  if (!result.ok) throw new Error(`stand-in user ${slug} is invalid`);
  return result.session;
}

function panel(session: ReturnType<typeof sessionFor> | null, enabled = true) {
  const noop = async () => {};
  return render(
    <StandInPanel
      enabled={enabled}
      session={session}
      users={STAND_IN_USERS}
      signInAs={noop}
      signOut={noop}
    />,
  );
}

describe("stand-in panel (#45)", () => {
  it("says a student has no positions, runs no boards, and is not a leader", () => {
    const { container } = panel(sessionFor("student"));
    const text = container.textContent;
    expect(text).toContain("Signed in as Jordan Lee");
    expect(text).toContain("Positions: none");
    expect(text).toContain("Reviews posts and runs: no boards");
    expect(text).toContain("SGA leader (sees who posted and who supported): No");
  });

  it("shows the DAB chair running the Dining Advisory Board only, as a leader", () => {
    const { container } = panel(sessionFor("dab-chair"));
    const text = container.textContent;
    expect(text).toContain("Positions: Chair of the Dining Advisory Board");
    expect(text).toContain("Reviews posts and runs: Dining Advisory Board");
    expect(text).not.toContain("Campus Services Committee, ");
    expect(text).toContain("SGA leader (sees who posted and who supported): Yes");
  });

  it("shows the VP running all five boards", () => {
    const { container } = panel(sessionFor("vp"));
    expect(container.textContent).toContain("Reviews posts and runs: all five boards");
    expect(container.textContent).toContain("SGA leader (sees who posted and who supported): Yes");
  });

  it("shows an unmapped position as no boards and not a leader", () => {
    const { container } = panel(sessionFor("other-position"));
    expect(container.textContent).toContain("Positions: Vice President of Finance");
    expect(container.textContent).toContain("Reviews posts and runs: no boards");
    expect(container.textContent).toContain("SGA leader (sees who posted and who supported): No");
  });

  it("lists every test user, with Signed in instead of a button for the current one", () => {
    const { getByLabelText, queryByLabelText, getAllByText } = panel(sessionFor("dab-chair"));
    expect(getByLabelText("Sign in as Jordan Lee")).toBeTruthy();
    expect(queryByLabelText("Sign in as Sam Rivera")).toBeNull();
    expect(getAllByText("Signed in").length).toBe(1);
  });

  it("says a signed-out viewer sees what a visitor sees, with no sign out button", () => {
    const { container, queryByText } = panel(null);
    expect(container.textContent).toContain("You are signed out. You see what a visitor sees.");
    expect(queryByText("Sign out")).toBeNull();
  });

  it("explains how to turn the stand-in on when it is off, with no user list", () => {
    const { container, queryByLabelText } = panel(null, false);
    expect(container.textContent).toContain(
      "The stand-in is off. Set AUTH_STAND_IN=1 in .env.local and restart the server.",
    );
    expect(queryByLabelText("Sign in as Jordan Lee")).toBeNull();
  });
});
