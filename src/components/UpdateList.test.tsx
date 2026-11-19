import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UpdateList } from "./UpdateList";

afterEach(cleanup);

describe("UpdateList (#130)", () => {
  it("lists each update with its age in words, capitalized, and its text", () => {
    render(
      <UpdateList
        updates={[
          { key: "a", daysAgo: 0, text: "The committee met." },
          { key: "b", daysAgo: 1, text: "Met with dining services." },
          { key: "c", daysAgo: 34, text: "Still working, no news." },
        ]}
      />,
    );
    const items = within(screen.getByRole("list", { name: "Updates" })).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "TodayThe committee met.",
      "YesterdayMet with dining services.",
      "34 days agoStill working, no news.",
    ]);
  });

  it("two updates with the same words are both listed", () => {
    render(
      <UpdateList
        updates={[
          { key: "a", daysAgo: 3, text: "Still working, no news." },
          { key: "b", daysAgo: 33, text: "Still working, no news." },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("labels a system row as a status change, and no other row (#131)", () => {
    render(
      <UpdateList
        updates={[
          { key: "a", daysAgo: 1, text: "Met with dining services.", kind: "board" },
          { key: "b", daysAgo: 2, text: "Still working, no news.", kind: "check_in" },
          { key: "c", daysAgo: 9, text: "The board started work on this idea.", kind: "system" },
          { key: "d", daysAgo: 10, text: "No kind given." },
        ]}
      />,
    );
    expect(screen.getAllByText("Status change")).toHaveLength(1);
    const items = screen.getAllByRole("listitem");
    expect(items[2]?.textContent).toBe("9 days agoStatus changeThe board started work on this idea.");
    expect(items[0]?.textContent).toBe("YesterdayMet with dining services.");
  });

  it("renders nothing when there are no updates", () => {
    const { container } = render(<UpdateList updates={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
