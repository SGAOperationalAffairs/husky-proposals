import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NavTab } from "@/core/navigation";
import { NavLinks } from "./NavLinks";

let path = "/";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

// jsdom has no matchMedia; the header reads reduced motion from it (#221).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

afterEach(() => {
  cleanup();
  path = "/";
});

const TABS: NavTab[] = [
  { id: "ideas", label: "Ideas", href: "/" },
  { id: "me", label: "My ideas", href: "/me" },
  { id: "queue", label: "Queue", href: "/queue" },
];

describe("header tabs (#221)", () => {
  it("marks the tab for the current page, and only that one", () => {
    path = "/me";
    render(<NavLinks tabs={TABS} waiting={0} />);
    expect(screen.getByRole("link", { name: "My ideas" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Ideas" }).getAttribute("aria-current")).toBeNull();
  });

  it("keeps the Ideas tab open on an idea's own page", () => {
    path = "/ideas/103";
    render(<NavLinks tabs={TABS} waiting={0} />);
    expect(screen.getByRole("link", { name: "Ideas" }).getAttribute("aria-current")).toBe("page");
  });

  it("draws one red line, and it is not announced", () => {
    path = "/queue";
    const { container } = render(<NavLinks tabs={TABS} waiting={0} />);
    const lines = container.querySelectorAll("[data-indicator]");
    expect(lines.length).toBe(1);
    expect(lines[0]!.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the red count on the Queue tab only when something waits", () => {
    path = "/queue";
    const { rerender } = render(<NavLinks tabs={TABS} waiting={2} />);
    // The words are text, not an aria-label on a plain span, so every screen reader reads them (#134).
    expect(screen.getByText("need attention")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Queue\s*2\s*need attention/ })).toBeTruthy();
    rerender(<NavLinks tabs={TABS} waiting={0} />);
    expect(screen.queryByText("need attention")).toBeNull();
  });
});
