import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";

const approvePost = vi.fn();
const declinePost = vi.fn();
const sendBackPost = vi.fn();
const takeDownPost = vi.fn();
const toast = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("./actions", () => ({
  approvePost: (arg: unknown) => approvePost(arg),
  declinePost: (arg: unknown) => declinePost(arg),
  sendBackPost: (arg: unknown) => sendBackPost(arg),
  takeDownPost: (arg: unknown) => takeDownPost(arg),
}));

import { useReviewActions } from "./useReviewActions";

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  approvePost.mockReset();
  declinePost.mockReset();
  sendBackPost.mockReset();
  takeDownPost.mockReset();
  toast.mockReset();
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

function DecisionHarness() {
  const { approve, decline, sendBack, takeDown } = useReviewActions();
  const target = { id: "i1", boardId: "DAB" as const };
  return (
    <>
      <button type="button" onClick={() => void approve(target)}>
        Approve
      </button>
      <button type="button" onClick={() => void decline(target, "Not this term.")}>
        Decline
      </button>
      <button
        type="button"
        onClick={() => void sendBack({ ...target, number: 103 }, "Add the cost and the place.")}
      >
        Send back
      </button>
      <button type="button" onClick={() => void takeDown({ ...target, number: 103 }, "Wrong details.")}>
        Take down
      </button>
    </>
  );
}

async function decide(name: string) {
  render(<DecisionHarness />);
  await act(async () => {
    screen.getByRole("button", { name }).click();
  });
}

// The leader cannot know whether the student turned these emails off, and decision emails
// wait for the scheduled send, so each toast says "any email" and "can take a while" (#211).
describe("decision toasts (#211)", () => {
  it("approving says any email to the student can take a while", async () => {
    approvePost.mockResolvedValue({ ok: true, number: 103 });
    await decide("Approve");
    expect(toast).toHaveBeenCalledWith({
      title: "Approved as #103",
      description:
        "Anyone with the link can see it now. Any email to the student can take a while to arrive.",
      board: "DAB",
    });
  });

  it("declining says the same about any email to them", async () => {
    declinePost.mockResolvedValue({ ok: true });
    await decide("Decline");
    expect(toast).toHaveBeenCalledWith({
      title: "Declined",
      description:
        "The student sees your reason and can edit it and send it again. Any email to them can take a while to arrive.",
      board: "DAB",
    });
  });

  it("sending back says the student can edit it, and the same about any email (#286)", async () => {
    sendBackPost.mockResolvedValue({ ok: true });
    await decide("Send back");
    expect(sendBackPost).toHaveBeenCalledWith({ ideaId: "i1", reason: "Add the cost and the place." });
    expect(toast).toHaveBeenCalledWith({
      title: "Sent back",
      description:
        "#103 is off the ideas list. The student can edit it and send it again. Any email to them can take a while to arrive.",
      board: "DAB",
    });
  });

  it("taking down says the same about any email to the student", async () => {
    takeDownPost.mockResolvedValue({ ok: true });
    await decide("Take down");
    expect(toast).toHaveBeenCalledWith({
      title: "Taken down",
      description: "#103 is no longer public. Any email to the student can take a while to arrive.",
      board: "DAB",
    });
  });
});
