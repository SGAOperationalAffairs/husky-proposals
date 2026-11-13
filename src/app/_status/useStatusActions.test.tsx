import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";

const startIdea = vi.fn();
const holdIdea = vi.fn();
const deliverIdea = vi.fn();
const refresh = vi.fn();
const toast = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("./actions", () => ({
  startIdea: (arg: unknown) => startIdea(arg),
  holdIdea: (arg: unknown) => holdIdea(arg),
  deliverIdea: (arg: unknown) => deliverIdea(arg),
}));

import { useStatusActions } from "./useStatusActions";

const target = { id: "i1", number: 103, boardId: "DAB" as const };

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  for (const fn of [startIdea, holdIdea, deliverIdea, refresh, toast]) fn.mockReset();
});
afterEach(() => {
  cleanup();
  disable?.();
});

function Harness() {
  const actions = useStatusActions();
  return (
    <>
      <button type="button" onClick={() => void actions.start(target)}>
        Start
      </button>
      <button type="button" onClick={() => void actions.startAnyway(target)}>
        Start anyway
      </button>
      <button type="button" onClick={() => void actions.hold(target, "It needs more information first")}>
        Hold
      </button>
      <button type="button" onClick={() => void actions.deliver(target)}>
        Deliver
      </button>
      <button type="button" onClick={actions.dismissHeadsUp}>
        Not now
      </button>
      <p data-testid="busy">{actions.busy ?? "idle"}</p>
      {actions.error && <p role="alert">{actions.error.text}</p>}
      {actions.headsUp && (
        <p data-testid="heads-up">
          {actions.headsUp.inProgress} of {actions.headsUp.guideline}
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

describe("useStatusActions (#98)", () => {
  it("a start toasts, refreshes the page, and sends no confirmation", async () => {
    startIdea.mockResolvedValue({ ok: true, status: "in_progress", number: 103 });
    render(<Harness />);
    await click("Start");
    expect(startIdea).toHaveBeenCalledWith({ ideaId: "i1" });
    expect(toast).toHaveBeenCalledWith({
      title: "Started #103",
      description: "Students see it as in progress, with an update on the idea page.",
      board: "DAB",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("busy").textContent).toBe("idle");
  });

  it("a heads-up holds the start and shows the numbers, with no toast or error", async () => {
    startIdea.mockResolvedValue({ ok: false, error: { code: "heads_up", inProgress: 2, guideline: 2 } });
    render(<Harness />);
    await click("Start");
    expect(screen.getByTestId("heads-up").textContent).toBe("2 of 2");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(getSnapshot().entries).toEqual([]);
  });

  it("Start anyway resends confirmed, and clears the heads-up", async () => {
    startIdea.mockResolvedValueOnce({ ok: false, error: { code: "heads_up", inProgress: 2, guideline: 2 } });
    startIdea.mockResolvedValueOnce({ ok: true, status: "in_progress", number: 103 });
    render(<Harness />);
    await click("Start");
    await click("Start anyway");
    expect(startIdea).toHaveBeenLastCalledWith({ ideaId: "i1", confirmed: true });
    expect(screen.queryByTestId("heads-up")).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("Not now clears the heads-up without calling anything", async () => {
    startIdea.mockResolvedValue({ ok: false, error: { code: "heads_up", inProgress: 1, guideline: 1 } });
    render(<Harness />);
    await click("Start");
    await click("Not now");
    expect(screen.queryByTestId("heads-up")).toBeNull();
    expect(startIdea).toHaveBeenCalledTimes(1);
  });

  it("a hold and a deliver toast their own words", async () => {
    holdIdea.mockResolvedValue({ ok: true, status: "waiting", number: 103 });
    deliverIdea.mockResolvedValue({ ok: true, status: "delivered", number: 103 });
    render(<Harness />);
    await click("Hold");
    expect(holdIdea).toHaveBeenCalledWith({ ideaId: "i1", reason: "It needs more information first" });
    expect(toast).toHaveBeenLastCalledWith({
      title: "On hold",
      description: "Students see your reason on the idea page.",
      board: "DAB",
    });
    await click("Deliver");
    expect(toast).toHaveBeenLastCalledWith({
      title: "Delivered",
      description: "#103 stays on record as delivered.",
      board: "DAB",
    });
  });

  it("an expected failure shows its copy and refreshes only when the page is stale", async () => {
    deliverIdea.mockResolvedValue({ ok: false, error: { code: "already_changed" } });
    render(<Harness />);
    await click("Deliver");
    expect(screen.getByRole("alert").textContent).toContain("Someone already changed this idea's status.");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getSnapshot().entries).toEqual([]);

    deliverIdea.mockResolvedValue({ ok: false, error: { code: "not_allowed" } });
    await click("Deliver");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a rejecting action and shows Try again", async () => {
    startIdea.mockRejectedValue(new Error("server blew up"));
    render(<Harness />);
    await click("Start");
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "server blew up" });
    expect(screen.getByRole("alert").textContent).toBe("That didn't go through. Try again.");
  });

  it("reports an unexpected result and shows Try again", async () => {
    startIdea.mockResolvedValue({
      ok: false,
      error: { code: "unexpected", report: { message: "startIdea: database is down" } },
    });
    render(<Harness />);
    await click("Start");
    expect(getSnapshot().entries[0]).toMatchObject({ message: "startIdea: database is down" });
    expect(screen.getByRole("alert").textContent).toBe("That didn't go through. Try again.");
  });
});
