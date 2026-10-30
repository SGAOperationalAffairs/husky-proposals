import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("home page placeholder (#26)", () => {
  it("names the site and does not promise action", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Husky Proposals" })).toBeTruthy();
    // Product rule: copy never promises that SGA will act.
    expect(document.body.textContent).not.toMatch(/we will (fix|do|build)|guarantee/i);
  });
});
