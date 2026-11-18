import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";
import type { PostIdeaInput } from "@/core/postIdea";

const postIdea = vi.fn();
const resubmitIdea = vi.fn();
const withdrawIdea = vi.fn();
vi.mock("./actions", () => ({
  postIdea: (arg: unknown) => postIdea(arg),
  resubmitIdea: (arg: unknown) => resubmitIdea(arg),
  withdrawIdea: (arg: unknown) => withdrawIdea(arg),
}));

import { usePostIdea } from "./usePostIdea";

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  postIdea.mockReset();
  resubmitIdea.mockReset();
  withdrawIdea.mockReset();
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

describe("usePostIdea with an idea id (#128)", () => {
  const ID = "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10";
  let lastWithdraw: string | null | undefined;

  function EditHarness() {
    const { submit, withdraw, phase, message } = usePostIdea(ID);
    return (
      <>
        <button type="button" onClick={() => void submit(validInput)}>
          Send
        </button>
        <button
          type="button"
          onClick={() =>
            void withdraw().then((line) => {
              lastWithdraw = line;
            })
          }
        >
          Withdraw
        </button>
        <p data-testid="phase">{phase}</p>
        {message && <p>{message}</p>}
      </>
    );
  }

  async function press(name: string) {
    await act(async () => {
      screen.getByRole("button", { name }).click();
    });
  }

  beforeEach(() => {
    lastWithdraw = undefined;
  });

  it("resubmits with the id, never posts, and clears that idea's draft", async () => {
    resubmitIdea.mockResolvedValue({ ok: true, id: ID, version: 2 });
    sessionStorage.setItem(`husky-proposals:post-draft:${ID}`, "{}");
    sessionStorage.setItem("husky-proposals:post-draft", "{}");
    render(<EditHarness />);
    await press("Send");
    expect(resubmitIdea).toHaveBeenCalledWith({ ...validInput, ideaId: ID });
    expect(postIdea).not.toHaveBeenCalled();
    expect(screen.getByTestId("phase").textContent).toBe("saved");
    expect(sessionStorage.getItem(`husky-proposals:post-draft:${ID}`)).toBeNull();
    expect(sessionStorage.getItem("husky-proposals:post-draft")).toBe("{}");
  });

  it("withdraws the idea once and ends in the withdrawn phase", async () => {
    withdrawIdea.mockResolvedValue({ ok: true, id: ID });
    render(<EditHarness />);
    await press("Withdraw");
    expect(withdrawIdea).toHaveBeenCalledTimes(1);
    expect(withdrawIdea).toHaveBeenCalledWith({ ideaId: ID });
    expect(lastWithdraw).toBeNull();
    expect(screen.getByTestId("phase").textContent).toBe("withdrawn");
  });

  it("returns the line when the withdrawal is refused, and goes back to idle", async () => {
    withdrawIdea.mockResolvedValue({ ok: false, error: { code: "already_changed" } });
    render(<EditHarness />);
    await press("Withdraw");
    expect(lastWithdraw).toContain("This post changed while you were editing");
    expect(screen.getByTestId("phase").textContent).toBe("idle");
  });

  it("returns the general line and reports when the withdraw action throws", async () => {
    withdrawIdea.mockRejectedValue(new Error("down"));
    render(<EditHarness />);
    await press("Withdraw");
    expect(lastWithdraw).toBe("That didn't go through. Try again.");
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "down" });
  });
});
