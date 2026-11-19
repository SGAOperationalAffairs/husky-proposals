import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";
import type { SettableEmailType } from "@/core/emailSettings";

const toast = vi.fn();
const setEmailSettingAction = vi.fn();
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("./actions", () => ({ setEmailSettingAction: (arg: unknown) => setEmailSettingAction(arg) }));

import { useEmailSettings } from "./useEmailSettings";

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  toast.mockReset();
  setEmailSettingAction.mockReset();
});
afterEach(() => {
  cleanup();
  disable?.();
});

const initial: Record<SettableEmailType, boolean> = {
  post_decided: true,
  post_status: true,
  digest: false,
  idea_event: true,
};

function Harness() {
  const { settings, busy, change } = useEmailSettings(initial);
  return (
    <>
      <button type="button" onClick={() => void change("post_decided", false)}>
        Turn off decisions
      </button>
      <button type="button" onClick={() => void change("digest", true)}>
        Turn on digest
      </button>
      <p data-testid="state">
        {Object.entries(settings)
          .map(([type, on]) => `${type}:${on ? "on" : "off"}`)
          .join(" ")}
      </p>
      <p data-testid="busy">{busy ?? "none"}</p>
    </>
  );
}

const state = () => screen.getByTestId("state").textContent;

async function click(name: string) {
  await act(async () => {
    screen.getByRole("button", { name }).click();
  });
}

describe("useEmailSettings (#211)", () => {
  it("shows the change at once and is busy until the action returns", async () => {
    let finish: (value: unknown) => void = () => undefined;
    setEmailSettingAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<Harness />);
    await click("Turn off decisions");
    expect(state()).toContain("post_decided:off");
    expect(screen.getByTestId("busy").textContent).toBe("post_decided");
    expect(setEmailSettingAction).toHaveBeenCalledWith({ type: "post_decided", on: false });

    await act(async () => finish({ ok: true, type: "post_decided", on: false }));
    expect(screen.getByTestId("busy").textContent).toBe("none");
  });

  it("toasts the label and the new state on success, with no description", async () => {
    setEmailSettingAction.mockResolvedValue({ ok: true, type: "digest", on: true });
    render(<Harness />);
    await click("Turn on digest");
    expect(state()).toContain("digest:on");
    expect(toast).toHaveBeenCalledWith({ title: "Weekly digest on" });

    setEmailSettingAction.mockResolvedValue({ ok: true, type: "post_decided", on: false });
    await click("Turn off decisions");
    expect(toast).toHaveBeenLastCalledWith({ title: "Decisions on my posts off" });
  });

  it("puts the checkbox back and says so when the change does not go through", async () => {
    setEmailSettingAction.mockResolvedValue({ ok: false, error: { code: "invalid" } });
    render(<Harness />);
    await click("Turn off decisions");
    expect(state()).toContain("post_decided:on");
    expect(toast).toHaveBeenCalledWith({ title: "That didn't go through. Try again." });
    expect(getSnapshot().entries).toEqual([]);
  });

  it("tells a signed-out student to sign in again", async () => {
    setEmailSettingAction.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    render(<Harness />);
    await click("Turn off decisions");
    expect(state()).toContain("post_decided:on");
    expect(toast).toHaveBeenCalledWith({ title: "You're signed out. Sign in again to change this." });
  });

  it("reports an unexpected result and reverts", async () => {
    setEmailSettingAction.mockResolvedValue({
      ok: false,
      error: { code: "unexpected", report: { message: "setEmailSetting: database is down" } },
    });
    render(<Harness />);
    await click("Turn off decisions");
    expect(state()).toContain("post_decided:on");
    expect(getSnapshot().entries[0]).toMatchObject({
      source: "action",
      message: "setEmailSetting: database is down",
    });
  });

  it("reverts and reports when the action throws", async () => {
    setEmailSettingAction.mockRejectedValue(new Error("server blew up"));
    render(<Harness />);
    await click("Turn off decisions");
    expect(state()).toContain("post_decided:on");
    expect(toast).toHaveBeenCalledWith({ title: "That didn't go through. Try again." });
    expect(getSnapshot().entries[0]).toMatchObject({ source: "action", message: "server blew up" });
  });
});
