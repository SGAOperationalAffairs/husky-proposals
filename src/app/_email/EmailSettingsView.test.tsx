import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMAIL_SETTINGS, SETTABLE_EMAIL_TYPES, type SettableEmailType } from "@/core/emailSettings";

vi.mock("@/components/Toast", () => ({ useToast: () => vi.fn() }));
vi.mock("./actions", () => ({ setEmailSettingAction: vi.fn() }));

import { EmailSettingsView } from "./EmailSettingsView";

afterEach(cleanup);

const allOn = Object.fromEntries(SETTABLE_EMAIL_TYPES.map((type) => [type, true])) as Record<
  SettableEmailType,
  boolean
>;

describe("EmailSettingsView (#211)", () => {
  it("shows the four settings in order, all checked by default", () => {
    render(<EmailSettingsView settings={allOn} stopped={false} sample={false} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.map((box) => box.closest("label")?.textContent)).toEqual(
      SETTABLE_EMAIL_TYPES.map((type) => `${EMAIL_SETTINGS[type].label}${EMAIL_SETTINGS[type].hint}`),
    );
    expect(boxes.every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(boxes.every((box) => !(box as HTMLInputElement).disabled)).toBe(true);
  });

  it("shows a setting the student turned off as unchecked", () => {
    render(<EmailSettingsView settings={{ ...allOn, digest: false }} stopped={false} sample={false} />);
    expect(screen.getByRole("checkbox", { name: "Weekly digest" })).toHaveProperty("checked", false);
    expect(screen.getByRole("checkbox", { name: "Decisions on my posts" })).toHaveProperty("checked", true);
  });

  it("explains the intro and the closing note", () => {
    render(<EmailSettingsView settings={allOn} stopped={false} sample={false} />);
    expect(
      screen.getByText("Choose which emails we send you. Each one is on until you turn it off."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "You can always see where your posts stand on My ideas. If an email to you bounces or is marked as spam, we stop all email to you.",
      ),
    ).toBeTruthy();
  });

  it("shows the stopped notice only when email is stopped, and the rows still work", () => {
    const notice =
      "Email to you is stopped because a message bounced or was marked as spam. Nothing below will send while it is stopped.";
    const { rerender } = render(<EmailSettingsView settings={allOn} stopped={false} sample={false} />);
    expect(screen.queryByText(notice)).toBeNull();
    rerender(<EmailSettingsView settings={allOn} stopped sample={false} />);
    expect(screen.getByText(notice)).toBeTruthy();
    expect(screen.getAllByRole("checkbox").every((box) => !(box as HTMLInputElement).disabled)).toBe(true);
  });

  it("on sample data, disables every row and says why", () => {
    render(<EmailSettingsView settings={allOn} stopped={false} sample />);
    expect(screen.getAllByRole("checkbox").every((box) => (box as HTMLInputElement).disabled)).toBe(true);
    expect(screen.getByText("Settings save once the site has a database.")).toBeTruthy();
  });

  it("never says petition or vote, or uses an em dash", () => {
    const { container } = render(<EmailSettingsView settings={allOn} stopped sample />);
    expect(container.textContent?.toLowerCase()).not.toMatch(/petition|vote|—/);
  });
});
