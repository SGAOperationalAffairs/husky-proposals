import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";

const approvePost = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));
vi.mock("./actions", () => ({
  approvePost: (arg: unknown) => approvePost(arg),
  declinePost: vi.fn(),
  takeDownPost: vi.fn(),
}));

import { useReviewActions } from "./useReviewActions";

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  approvePost.mockReset();
});
afterEach(() => {
  cleanup();
  disable?.();
});

function Harness() {
  const { approve, error } = useReviewActions();
  return (
    <>
      <button type="button" onClick={() => void approve({ id: "i1", boardId: "DAB" })}>
        Approve
      </button>
      {error && <p>{error.text}</p>}
    </>
  );
}

async function click() {
  render(<Harness />);
  await act(async () => {
    screen.getByRole("button", { name: "Approve" }).click();
  });
}

describe("useReviewActions error reporting (#191)", () => {
  it("reports a rejecting action and shows Try again", async () => {
    approvePost.mockRejectedValue(new Error("server blew up"));
    await click();
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "server blew up" });
    expect(screen.getByText("That didn't go through. Try again.")).toBeTruthy();
  });

  it("reports an unexpected result and shows Try again", async () => {
    approvePost.mockResolvedValue({
      ok: false,
      error: { code: "unexpected", report: { message: "approvePost: database is down" } },
    });
    await click();
    expect(getSnapshot().entries[0]).toMatchObject({
      source: "action",
      message: "approvePost: database is down",
    });
    expect(screen.getByText("That didn't go through. Try again.")).toBeTruthy();
  });

  it("does not report an expected result", async () => {
    approvePost.mockResolvedValue({ ok: false, error: { code: "already_decided" } });
    await click();
    expect(getSnapshot().entries).toEqual([]);
  });
});
