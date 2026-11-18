import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailSetting } from "./EmailSetting";

afterEach(cleanup);

const base = { label: "Weekly digest", hint: "Once a week.", checked: true, busy: false, disabled: false };

describe("EmailSetting (#211)", () => {
  it("is a checkbox named by its label, with the hint linked to it", () => {
    render(<EmailSetting {...base} onChange={vi.fn()} />);
    const box = screen.getByRole("checkbox", { name: "Weekly digest" });
    expect(box).toHaveProperty("checked", true);
    expect(box.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(box.getAttribute("aria-describedby")!)?.textContent).toBe("Once a week.");
  });

  it("reports the state the student wants, never a toggle", () => {
    const onChange = vi.fn();
    const { rerender } = render(<EmailSetting {...base} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith(false);

    rerender(<EmailSetting {...base} checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it("is disabled while busy, and when disabled", () => {
    const { rerender } = render(<EmailSetting {...base} busy onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toHaveProperty("disabled", true);
    rerender(<EmailSetting {...base} disabled onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toHaveProperty("disabled", true);
  });

  it("is usable when neither busy nor disabled", () => {
    render(<EmailSetting {...base} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toHaveProperty("disabled", false);
  });
});
