import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/ideas/103" }));
vi.mock("next/link", () => ({
  default: () => {
    throw new Error("account links must be plain anchors");
  },
}));
vi.mock("@/app/_account/actions", () => ({ signOut: async () => {} }));

import { AccountLinks } from "./AccountLinks";

afterEach(cleanup);

const SIGN_OUT =
  "https://dev.auth.northeasternsga.com/logout?redirect=https%3A%2F%2Fdev.proposals.northeasternsga.com%2F";

describe("account links (#177)", () => {
  it("renders nothing when nothing can sign you in", () => {
    const { container } = render(<AccountLinks canSignIn={false} name={null} signOutHref={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("offers a plain Sign in link back to the current page when signed out", () => {
    const { getByRole } = render(<AccountLinks canSignIn name={null} signOutHref={null} />);
    expect(getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in?next=%2Fideas%2F103");
  });

  it("shows the name and SGAuth's sign-out link, with no form, when signed in on dev", () => {
    const { getByRole, container } = render(
      <AccountLinks canSignIn name="Sam Rivera" signOutHref={SIGN_OUT} />,
    );
    expect(container.textContent).toContain("Sam Rivera");
    expect(getByRole("link", { name: "Sign out" }).getAttribute("href")).toBe(SIGN_OUT);
    expect(container.querySelector("form")).toBeNull();
  });

  it("signs out the stand-in with a form button", () => {
    const { getByRole, container } = render(<AccountLinks canSignIn name="Sam Rivera" signOutHref={null} />);
    expect(container.querySelector("form")).not.toBeNull();
    expect(getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
