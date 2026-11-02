import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("ideas list (#61)", () => {
  it("names the page and never promises action or says petition", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Ideas for campus" })).toBeTruthy();
    // Product rules: copy never promises that SGA will act, and never says petition.
    expect(document.body.textContent).not.toMatch(/we will (fix|do|build)|guarantee|petition/i);
  });

  it("drops the intro paragraph under the title", () => {
    render(<Home />);
    expect(document.body.textContent).not.toMatch(/Every poster is an idea a student posted/);
  });

  it("puts the way to post right under the title, before the wall", () => {
    render(<Home />);
    const title = screen.getByRole("heading", { level: 1, name: "Ideas for campus" });
    const submit = screen.getByRole("link", { name: /Have an idea for campus\?\s*Submit yours/ });
    // The block comes after the title in the document. (The wall waits in a
    // Suspense boundary, so its board chips are checked in IdeaFilters.test.tsx.)
    expect(title.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
