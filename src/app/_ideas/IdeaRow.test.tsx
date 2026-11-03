import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { IdeaCardData } from "@/components/IdeaCard";
import { IdeaRow } from "./IdeaRow";

afterEach(cleanup);

// The list row on the ideas page (#138) shows public fields only.
const idea: IdeaCardData = {
  number: 103,
  title: "A student-hosted food pantry",
  description: "Groceries, hosted by an existing campus office.",
  board: "DAB",
  status: "in_progress",
  updatedDaysAgo: 2,
  supportCount: 412,
  willingCount: 38,
};

describe("the ideas list row (#138)", () => {
  it("shows the title, board, number, status, and support", () => {
    render(
      <ul>
        <IdeaRow idea={idea} />
      </ul>,
    );
    const row = within(screen.getByRole("listitem"));
    expect(row.getByRole("link", { name: "A student-hosted food pantry" }).getAttribute("href")).toBe(
      "/ideas/103",
    );
    expect(row.getByText("Dining")).toBeTruthy();
    expect(row.getByText("#103")).toBeTruthy();
    expect(row.getByText("In progress")).toBeTruthy();
    expect(row.getByText("412")).toBeTruthy();
  });

  it("never shows a name or the poster's author", () => {
    render(
      <ul>
        <IdeaRow idea={{ ...idea, author: "Avery K." } as IdeaCardData} />
      </ul>,
    );
    expect(screen.queryByText("Avery K.")).toBeNull();
  });
});
