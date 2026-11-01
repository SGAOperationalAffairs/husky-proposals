import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SignInClosed } from "./SignInClosed";

afterEach(cleanup);

describe("sign-in closed panel (#93)", () => {
  it("says sign-in is not open and that browsing still works, with no date", () => {
    const { getByRole, container } = render(<SignInClosed />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Sign-in isn't open yet.");
    expect(container.textContent).toContain("You can still browse every idea without signing in.");
  });

  it("links to the ideas list", () => {
    const { getByRole } = render(<SignInClosed />);
    expect(getByRole("link", { name: "Browse ideas" }).getAttribute("href")).toBe("/");
  });
});
