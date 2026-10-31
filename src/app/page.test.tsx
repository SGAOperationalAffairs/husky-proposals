import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("ideas list (#61)", () => {
  it("names the page and says support informs, without promising action", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Ideas for campus" })).toBeTruthy();
    expect(document.body.textContent).toMatch(/Support helps SGA decide; it is not a vote\./);
    // Product rules: copy never promises that SGA will act, and never says petition.
    expect(document.body.textContent).not.toMatch(/we will (fix|do|build)|guarantee|petition/i);
  });
});
