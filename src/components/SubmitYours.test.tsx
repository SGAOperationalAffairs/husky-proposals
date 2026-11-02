import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubmitYours } from "./SubmitYours";

afterEach(cleanup);

describe("Have an idea for campus?", () => {
  it("is one link to the post form, so the whole block is clickable", () => {
    render(<SubmitYours />);
    const link = screen.getByRole("link", { name: /Have an idea for campus\?\s*Submit yours/ });
    expect(link.getAttribute("href")).toBe("/post");
  });

  it("has no border", () => {
    render(<SubmitYours />);
    const link = screen.getByRole("link");
    expect(link.className).not.toMatch(/bordered/);
  });
});
