// Tests for the required mark and the character count on text fields (#55).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TextArea, TextField } from "./Field";

afterEach(cleanup);

describe("required fields and character counts (#55)", () => {
  it("marks a required label with an asterisk, and says required to a screen reader", () => {
    const { container } = render(<TextField label="Title" required value="" onChange={() => {}} />);
    expect(container.querySelector("label")?.textContent).toContain("*");
    expect(container.querySelector("label")?.textContent).toContain("(required)");
    expect(container.querySelector("input")?.getAttribute("aria-required")).toBe("true");
  });

  it("leaves an optional label without a mark", () => {
    const { container } = render(<TextArea label="Notes" value="" onChange={() => {}} />);
    expect(container.querySelector("label")?.textContent).not.toContain("*");
  });

  it("shows how many characters are used against the limit", () => {
    render(<TextArea label="Summary" max={140} value="Hello" onChange={() => {}} />);
    expect(screen.getByText("5 of 140 characters")).toBeTruthy();
  });

  it("says how many more a minimum needs once something is written", () => {
    render(<TextArea label="Details" min={80} max={4000} value={"x".repeat(30)} onChange={() => {}} />);
    expect(screen.getByText("30 of 4000 characters, 50 more needed")).toBeTruthy();
  });

  it("shows no count on a field without a limit", () => {
    render(<TextField label="Where" value="Marino" onChange={() => {}} />);
    expect(screen.queryByText(/characters/)).toBeNull();
  });
});
