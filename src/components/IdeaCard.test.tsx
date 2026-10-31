import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IdeaCard } from "./IdeaCard";

afterEach(cleanup);

const idea = {
  number: 96,
  title: "A late shuttle on Friday nights",
  description: "Run the campus shuttle until 2 a.m. on Fridays.",
  board: "CSC" as const,
  updatedDaysAgo: 20,
  supportCount: 305,
  willingCount: 27,
};

describe("idea card From SGA tag (#35)", () => {
  it("renders the shared tag in the poster's color when fromSga is set", () => {
    render(<IdeaCard {...idea} status="collecting_support" fromSga />);
    const tag = screen.getByText("From SGA");
    expect(tag.classList.contains("bordered")).toBe(true);
    expect(tag.classList.contains("border-current")).toBe(true);
  });

  it("shows no tag without fromSga", () => {
    render(<IdeaCard {...idea} status="collecting_support" />);
    expect(screen.queryByText("From SGA")).toBeNull();
  });
});

describe("idea card on a delivered idea (#63)", () => {
  it("drops Support and I'll participate, and speaks of support in the past", () => {
    render(<IdeaCard {...idea} status="delivered" />);
    expect(screen.queryByRole("button", { name: "Support" })).toBeNull();
    expect(document.body.textContent).toMatch(/305students supported this/);
  });

  it("keeps both buttons on an idea still collecting support", () => {
    render(<IdeaCard {...idea} status="collecting_support" />);
    expect(screen.getByRole("button", { name: "Support" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "I'll participate" })).toBeTruthy();
  });
});
