import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthorIdeaPanel } from "./AuthorIdeaPanel";

// The author's panel on an approved idea's page (#295).
afterEach(cleanup);

const ID = "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10";

describe("AuthorIdeaPanel (#295)", () => {
  it("no edit: offers Edit your post, and says a reviewer checks every change", () => {
    render(<AuthorIdeaPanel ideaId={ID} edit="none" />);
    expect(screen.getByRole("heading", { name: "Your post" })).toBeTruthy();
    expect(
      screen.getByText(
        "You posted this. You can edit it. A reviewer checks every change before students see it.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit your post" }).getAttribute("href")).toBe(
      `/me/ideas/${ID}/edit`,
    );
  });

  it("an edit waiting: says so and links to the changes", () => {
    render(<AuthorIdeaPanel ideaId={ID} edit="pending" />);
    expect(
      screen.getByText(
        "Your changes are waiting for review. Students see the version on this page until a reviewer approves them.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "See your changes" }).getAttribute("href")).toBe(
      `/me/ideas/${ID}/edit`,
    );
    expect(screen.queryByRole("link", { name: "Edit your post" })).toBeNull();
  });

  it("a declined edit: says so and links to the reason", () => {
    render(<AuthorIdeaPanel ideaId={ID} edit="declined" />);
    expect(
      screen.getByText(
        "A reviewer did not approve your changes. Students still see the version on this page.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "See why" }).getAttribute("href")).toBe(`/me/ideas/${ID}/edit`);
  });

  it("uses no em dash and promises nothing", () => {
    for (const edit of ["none", "pending", "declined"] as const) {
      render(<AuthorIdeaPanel ideaId={ID} edit={edit} />);
      expect(document.body.textContent).not.toMatch(/—|petition|will be approved|we will/i);
      cleanup();
    }
  });
});
