import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";
import type { PostIdeaInput } from "@/core/postIdea";

const postIdea = vi.fn();
vi.mock("./actions", () => ({ postIdea: (arg: unknown) => postIdea(arg) }));

import { usePostIdea } from "./usePostIdea";

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  postIdea.mockReset();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  disable?.();
});

// The hook does not parse the input (the action is mocked), so any well-formed literal works.
const validInput: PostIdeaInput = {
  title: "More outlets in the library",
  summary: "Add outlets to the third floor study tables.",
  details: "The third floor tables have no outlets, so students sit on the floor to charge laptops. ".repeat(
    2,
  ),
  category: "campus_services",
  location: null,
  scale: null,
  costBand: null,
  timeHorizon: null,
  anonymous: false,
};

function Harness() {
  const { submit, message } = usePostIdea();
  return (
    <>
      <button type="button" onClick={() => void submit(validInput)}>
        Post
      </button>
      {message && <p>{message}</p>}
    </>
  );
}

async function click() {
  render(<Harness />);
  await act(async () => {
    screen.getByRole("button", { name: "Post" }).click();
  });
}

describe("usePostIdea error reporting (#207)", () => {
  it("reports a rejecting action and shows Try again", async () => {
    postIdea.mockRejectedValue(new Error("server blew up"));
    await click();
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "server blew up" });
    expect(screen.getByText("That didn't go through. Try again.")).toBeTruthy();
  });

  it("reports an unexpected result and shows Try again", async () => {
    postIdea.mockResolvedValue({
      ok: false,
      error: { code: "unexpected", report: { message: "postIdea: database is down" } },
    });
    await click();
    expect(getSnapshot().entries).toHaveLength(1);
    expect(getSnapshot().entries[0]).toMatchObject({
      source: "action",
      message: "postIdea: database is down",
    });
    expect(screen.getByText("That didn't go through. Try again.")).toBeTruthy();
  });

  it("does not report an unexpected result without a report (production)", async () => {
    postIdea.mockResolvedValue({ ok: false, error: { code: "unexpected" } });
    await click();
    expect(getSnapshot().entries).toEqual([]);
    expect(screen.getByText("That didn't go through. Try again.")).toBeTruthy();
  });

  it.each([
    ["pending_limit", { code: "pending_limit", limit: 3 }],
    ["cross_origin", { code: "cross_origin" }],
    ["signed_out", { code: "signed_out" }],
    ["invalid", { code: "invalid", fields: ["title"] }],
  ])("does not report an expected %s result", async (_name, error) => {
    postIdea.mockResolvedValue({ ok: false, error });
    await click();
    expect(getSnapshot().entries).toEqual([]);
  });
});
