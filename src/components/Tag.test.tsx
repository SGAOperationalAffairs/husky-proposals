import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FromSgaTag } from "./Tag";

afterEach(cleanup);

describe("From SGA tag (#35)", () => {
  it("is outlined in the line color by default, at tag size", () => {
    render(<FromSgaTag />);
    const tag = screen.getByText("From SGA");
    expect(tag.classList.contains("bordered")).toBe(true);
    expect(tag.classList.contains("text-xs")).toBe(true);
    expect(tag.classList.contains("font-bold")).toBe(true);
    expect(tag.classList.contains("border-current")).toBe(false);
  });

  it("takes the poster's text color and its line's type on a poster", () => {
    render(<FromSgaTag look="poster" />);
    const tag = screen.getByText("From SGA");
    expect(tag.classList.contains("bordered")).toBe(true);
    expect(tag.classList.contains("border-current")).toBe(true);
    expect(tag.classList.contains("text-xs")).toBe(false);
  });
});
