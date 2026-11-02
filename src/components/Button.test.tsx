import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button, buttonLook } from "./Button";

afterEach(cleanup);

// The four variants keep their exact classes (#55 added "text" beside the
// others). A change to any of them changes what the app looks like, so these
// strings are pinned on purpose.
describe("buttonLook", () => {
  it("keeps the primary, line, and plain looks as they were", () => {
    expect(buttonLook("primary")).toBe(
      "inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 bg-accent text-on-accent border-accent px-3.5 py-2",
    );
    expect(buttonLook("line", "sm")).toBe(
      "inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 bg-transparent text-accent-text border-accent-text px-2.5 py-1 text-sm",
    );
    expect(buttonLook("plain")).toBe(
      "inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 bg-surface text-ink  px-3.5 py-2",
    );
  });

  it("pins the text look: no box, no side padding, underline on hover", () => {
    expect(buttonLook("text")).toBe(
      "inline-flex items-center justify-center gap-2 rounded-button bordered font-medium aria-disabled:opacity-55 bg-transparent text-accent-text border-transparent py-2 underline-offset-4 hover:underline",
    );
    expect(buttonLook("text", "sm")).toContain("py-1 text-sm");
  });
});

describe("Button", () => {
  it("renders a button of type button by default, with the plain look", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toBe(`${buttonLook("plain")} `);
  });

  it("puts the icon before the label and hides it from screen readers", () => {
    render(
      <Button variant="text" icon={<svg data-testid="chevron" />}>
        Back to ideas
      </Button>,
    );
    const icon = screen.getByTestId("chevron");
    expect(icon.parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: "Back to ideas" })).toBeTruthy();
  });

  it("renders a same-site href as a link with the button look", () => {
    render(
      <Button variant="text" href="/ideas/103" className="self-start">
        Back to ideas
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Back to ideas" });
    expect(link.getAttribute("href")).toBe("/ideas/103");
    expect(link.className).toBe(`${buttonLook("text")} self-start`);
  });

  it("renders mail, text, download, and new-tab links as plain anchors", () => {
    render(
      <>
        <Button href="mailto:?subject=Idea" variant="primary">
          Email
        </Button>
        <Button href="sms:?&body=Idea">Text</Button>
        <Button href="/ideas/103/poster" download="poster.png" variant="primary">
          Download
        </Button>
        <Button href="/ideas/103/flyer" target="_blank" rel="noopener">
          Flyer
        </Button>
      </>,
    );
    for (const name of ["Email", "Text", "Download", "Flyer"]) {
      const link = screen.getByRole("link", { name });
      expect(link.tagName).toBe("A");
    }
    expect(screen.getByRole("link", { name: "Download" }).getAttribute("download")).toBe("poster.png");
    expect(screen.getByRole("link", { name: "Flyer" }).getAttribute("target")).toBe("_blank");
  });
});
