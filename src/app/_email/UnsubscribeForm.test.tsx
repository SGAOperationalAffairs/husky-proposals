import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableReports, getSnapshot } from "@/app/_errors/reports";
import { UNSUBSCRIBE_COPY, UNSUBSCRIBE_FAILED_TEXT } from "./messages";

const unsubscribeAction = vi.fn();
vi.mock("./actions", () => ({
  unsubscribeAction: (previous: unknown, formData: FormData) => unsubscribeAction(previous, formData),
}));

import { UnsubscribeForm } from "./UnsubscribeForm";

let disable: (() => void) | undefined;
beforeEach(() => {
  disable = enableReports();
  unsubscribeAction.mockReset();
});
afterEach(() => {
  cleanup();
  disable?.();
});

const TOKEN = "digest.00000000-0000-4000-8000-0000000000a1.signature";
const stopButton = () => screen.getByRole("button", { name: /^Stop|^Stopping/ });

async function tapStop() {
  await act(async () => {
    stopButton().click();
  });
}

describe("UnsubscribeForm (#212)", () => {
  it("asks once, with the stop button and a way to the other emails", () => {
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    expect(screen.getByText(UNSUBSCRIBE_COPY.ask)).toBeTruthy();
    expect(stopButton().textContent).toBe("Stop the weekly digest");
    expect(screen.getByRole("link", { name: "Change other emails" }).getAttribute("href")).toBe(
      "/me/notifications",
    );
    expect(screen.queryByText(UNSUBSCRIBE_COPY.preview)).toBeNull();
    expect(unsubscribeAction).not.toHaveBeenCalled();
  });

  it("sends only the token from the form, and nothing happens before the tap", async () => {
    unsubscribeAction.mockResolvedValue({ ok: true, type: "digest" });
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    expect(unsubscribeAction).not.toHaveBeenCalled();
    await tapStop();
    expect(unsubscribeAction).toHaveBeenCalledTimes(1);
    const formData = unsubscribeAction.mock.calls[0]?.[1] as FormData;
    expect([...formData.keys()]).toEqual(["token"]);
    expect(formData.get("token")).toBe(TOKEN);
  });

  it("while saving the button is aria-disabled and reads Stopping..., and a second tap sends nothing", async () => {
    let finish: (value: unknown) => void = () => undefined;
    unsubscribeAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    await tapStop();
    expect(stopButton().textContent).toBe("Stopping...");
    expect(stopButton().getAttribute("aria-disabled")).toBe("true");
    await tapStop();
    expect(unsubscribeAction).toHaveBeenCalledTimes(1);
    await act(async () => finish({ ok: true, type: "digest" }));
  });

  it("when it is done, says so in a status region with a link to the settings, and the button is gone", async () => {
    unsubscribeAction.mockResolvedValue({ ok: true, type: "digest" });
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    await tapStop();
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(
      "The weekly digest is off.You will not get it again unless you turn it back on in your notification settings.",
    );
    expect(status.querySelector("a")?.getAttribute("href")).toBe("/me/notifications");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("when the save fails, keeps the button and says to try again", async () => {
    unsubscribeAction.mockResolvedValue({ ok: false, error: { code: "cross_origin" } });
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    await tapStop();
    expect(screen.getByRole("alert").textContent).toBe(UNSUBSCRIBE_FAILED_TEXT);
    expect(stopButton().textContent).toBe("Stop the weekly digest");
    expect(stopButton().getAttribute("aria-disabled")).toBe("false");
  });

  it("an unexpected failure shows the same line and goes to the error floater", async () => {
    unsubscribeAction.mockResolvedValue({
      ok: false,
      error: { code: "unexpected", report: { message: "unsubscribe: boom" } },
    });
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    await tapStop();
    expect(screen.getByRole("alert").textContent).toBe(UNSUBSCRIBE_FAILED_TEXT);
    expect(
      getSnapshot()
        .entries.map((entry) => entry.message)
        .join("\n"),
    ).toContain("unsubscribe: boom");
  });

  it("a link that stopped verifying reads as a link that does not work", async () => {
    unsubscribeAction.mockResolvedValue({ ok: false, error: { code: "invalid" } });
    render(<UnsubscribeForm token={TOKEN} sample={false} />);
    await tapStop();
    expect(screen.getByRole("alert").textContent).toBe(UNSUBSCRIBE_COPY.invalid);
  });

  it("says nothing is saved in a preview with no database", () => {
    render(<UnsubscribeForm token={TOKEN} sample />);
    expect(screen.getByText("This preview has no database, so nothing is saved.")).toBeTruthy();
  });

  it("never says petition, and has no em dash", () => {
    for (const copy of [...Object.values(UNSUBSCRIBE_COPY), UNSUBSCRIBE_FAILED_TEXT]) {
      expect(copy.toLowerCase()).not.toContain("petition");
      expect(copy).not.toContain("—");
    }
  });
});
