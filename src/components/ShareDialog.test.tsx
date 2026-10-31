import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShareDialog } from "./ShareDialog";

afterEach(cleanup);

const idea = {
  number: 103,
  title: "A student-hosted food pantry",
  description: "A free, stigma-free place to pick up groceries and essentials.",
  board: "DAB" as const,
};
const link = `${window.location.origin}/ideas/103`;

async function open() {
  render(<ShareDialog {...idea} />);
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  return screen.findByRole("dialog", { name: "Share this idea" });
}

describe("share dialog (#64)", () => {
  it("starts on the link, with ways to send it", async () => {
    const dialog = await open();
    expect(within(dialog).getByRole("tab", { name: "Link", selected: true })).toBeTruthy();
    expect((within(dialog).getByLabelText("Link to this idea") as HTMLInputElement).value).toBe(link);
    expect(within(dialog).getByRole("button", { name: "Copy link" })).toBeTruthy();
    const text = within(dialog).getByRole("link", { name: "Text" }).getAttribute("href")!;
    expect(text.startsWith("sms:")).toBe(true);
    expect(decodeURIComponent(text)).toContain(link);
    const email = within(dialog).getByRole("link", { name: "Email" }).getAttribute("href")!;
    expect(email.startsWith("mailto:")).toBe(true);
    // The message never promises action (CLAUDE.md, product rules).
    expect(decodeURIComponent(email)).not.toMatch(/will (fix|do|build)|guarantee|petition/i);
  });

  it("offers the poster image as a download", async () => {
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole("tab", { name: "Poster" }));
    const download = within(dialog).getByRole("link", { name: "Download poster" });
    expect(download.getAttribute("href")).toBe("/ideas/103/poster");
    expect(download.getAttribute("download")).toBe("idea-103-poster.png");
    expect(
      within(dialog)
        .getByRole("img", { name: /Poster for #103/ })
        .getAttribute("src"),
    ).toBe("/ideas/103/poster");
  });

  it("previews the flyer with its QR code and opens the printable page", async () => {
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole("tab", { name: "Flyer" }));
    expect(within(dialog).getByRole("img", { name: `QR code for ${link}` })).toBeTruthy();
    const print = within(dialog).getByRole("link", { name: "Open the flyer to print" });
    expect(print.getAttribute("href")).toBe("/ideas/103/flyer");
    expect(print.getAttribute("target")).toBe("_blank");
  });
});
