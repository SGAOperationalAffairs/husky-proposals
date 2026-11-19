import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";

const postUpdateAction = vi.fn();
const refresh = vi.fn();
const toast = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("./actions", () => ({ postUpdateAction: (arg: unknown) => postUpdateAction(arg) }));

import { usePostUpdate } from "./usePostUpdate";

const target = { id: "i1", number: 103, boardId: "DAB" as const, cadenceDays: 30 };

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  for (const fn of [postUpdateAction, refresh, toast]) fn.mockReset();
});
afterEach(() => {
  cleanup();
  disable?.();
});

function Harness() {
  const updates = usePostUpdate();
  return (
    <>
      <button type="button" onClick={() => void updates.post(target, "The committee met.")}>
        Post
      </button>
      <button type="button" onClick={() => void updates.checkIn(target)}>
        Check in
      </button>
      <p data-testid="busy">{updates.busy ?? "idle"}</p>
      {updates.error && (
        <p role="alert" data-field={updates.error.field ?? ""}>
          {updates.error.text}
        </p>
      )}
    </>
  );
}

async function click(name: string) {
  await act(async () => {
    screen.getByRole("button", { name }).click();
  });
}

describe("usePostUpdate (#130)", () => {
  it("a board update sends the body, toasts the next step, and refreshes the page", async () => {
    postUpdateAction.mockResolvedValue({ ok: true, number: 103, kind: "board" });
    render(<Harness />);
    await click("Post");
    expect(postUpdateAction).toHaveBeenCalledWith({
      ideaId: "i1",
      kind: "board",
      body: "The committee met.",
    });
    expect(toast).toHaveBeenCalledWith({
      title: "Update posted on #103",
      description: "Students see it on the idea page. Next one due in 30 days.",
      board: "DAB",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("busy").textContent).toBe("idle");
  });

  it("a check-in sends no body and toasts its own words", async () => {
    postUpdateAction.mockResolvedValue({ ok: true, number: 103, kind: "check_in" });
    render(<Harness />);
    await click("Check in");
    expect(postUpdateAction).toHaveBeenCalledWith({ ideaId: "i1", kind: "check_in" });
    expect(toast).toHaveBeenCalledWith({
      title: "Check-in posted on #103",
      description: 'Students see "Still working, no news." Next one due in 30 days.',
      board: "DAB",
    });
  });

  it("an empty body shows its copy on the body field, with no toast or refresh", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "invalid", fields: ["body"] } });
    render(<Harness />);
    await click("Post");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Write the update students will read, up to 1,000 characters.");
    expect(alert.getAttribute("data-field")).toBe("body");
    expect(toast).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(getSnapshot().entries).toEqual([]);
  });

  it("a leftover placeholder shows its copy", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "body_placeholder" } });
    render(<Harness />);
    await click("Post");
    expect(screen.getByRole("alert").textContent).toBe("Replace the parts in [brackets] before you post.");
  });

  it("an idea no longer in progress says so and refreshes the list", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "not_in_progress" } });
    render(<Harness />);
    await click("Check in");
    expect(screen.getByRole("alert").textContent).toBe(
      "This idea is no longer in progress. The list now shows where it stands.",
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a refusal that leaves the list as it is does not refresh", async () => {
    postUpdateAction.mockResolvedValue({ ok: false, error: { code: "not_allowed" } });
    render(<Harness />);
    await click("Post");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a rejecting action and shows Try again", async () => {
    postUpdateAction.mockRejectedValue(new Error("server blew up"));
    render(<Harness />);
    await click("Post");
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "server blew up" });
    expect(screen.getByRole("alert").textContent).toBe("That didn't go through. Try again.");
  });

  it("reports an unexpected result and shows Try again", async () => {
    postUpdateAction.mockResolvedValue({
      ok: false,
      error: { code: "unexpected", report: { message: "postUpdate: database is down" } },
    });
    render(<Harness />);
    await click("Post");
    expect(getSnapshot().entries[0]).toMatchObject({ message: "postUpdate: database is down" });
    expect(screen.getByRole("alert").textContent).toBe("That didn't go through. Try again.");
  });
});
