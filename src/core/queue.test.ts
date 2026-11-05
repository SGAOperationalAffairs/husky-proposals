import { describe, expect, it } from "vitest";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "./positions";
import { attentionCount, filterQueue, parseQueueView, queueFor, type QueueItem } from "./queue";
import type { Viewer } from "./permissions";

// The SGA queue (#124): which posts and ideas a viewer sees, and what the tabs count.
const viewer = (id: string, positions: string[]): Viewer => ({
  user: { id },
  roles: rolesFromPositions(positions),
});
const student = viewer("student", []);
const dabChair = viewer("dab-chair", [BOARD_POSITIONS.DAB.lead]);
const vp = viewer("vp", [VP_CAMPUS_AFFAIRS]);

const items: QueueItem[] = [
  {
    kind: "post",
    number: 201,
    title: "A pending dining idea",
    boardId: "DAB",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 1,
  },
  {
    kind: "post",
    number: 202,
    title: "A pending shuttle idea",
    boardId: "CSC",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 3,
  },
  {
    kind: "idea",
    number: 103,
    title: "A food pantry",
    boardId: "DAB",
    status: "in_progress",
    supportCount: 412,
    updatedDaysAgo: 2,
  },
  {
    kind: "idea",
    number: 96,
    title: "A late shuttle",
    boardId: "CSC",
    status: "waiting",
    supportCount: 305,
    updatedDaysAgo: 20,
  },
];

describe("queueFor", () => {
  it("shows nothing to a student or a signed-out visitor", () => {
    expect(queueFor(student, items)).toEqual([]);
    expect(queueFor(null, items)).toEqual([]);
  });

  it("shows a chair only their own board", () => {
    expect(queueFor(dabChair, items).map((i) => i.number)).toEqual([201, 103]);
  });

  it("shows the VP all five boards", () => {
    expect(queueFor(vp, items)).toHaveLength(items.length);
  });
});

describe("attentionCount", () => {
  it("counts only pending posts, since those need a decision now", () => {
    expect(attentionCount(items)).toBe(2);
    expect(attentionCount(items.filter((i) => i.kind === "idea"))).toBe(0);
  });
});

describe("filterQueue", () => {
  it("filters by board and status", () => {
    expect(filterQueue(items, { sort: "support", board: "CSC" }).map((i) => i.number)).toEqual([96, 202]);
    expect(filterQueue(items, { sort: "support", status: "waiting" }).map((i) => i.number)).toEqual([96]);
  });

  it("sorts by support, newest, or recently updated", () => {
    expect(filterQueue(items, { sort: "support" }).map((i) => i.number)).toEqual([103, 96, 201, 202]);
    expect(filterQueue(items, { sort: "newest" }).map((i) => i.number)).toEqual([202, 201, 103, 96]);
    expect(filterQueue(items, { sort: "updated" }).map((i) => i.number)).toEqual([201, 103, 202, 96]);
  });
});

// The queue's view in the URL (#139): list by default, cards only when asked.
describe("parseQueueView", () => {
  it("returns cards only for view=cards, and the list otherwise", () => {
    expect(parseQueueView("cards")).toBe("cards");
    expect(parseQueueView("list")).toBe("list");
    expect(parseQueueView("table")).toBe("list");
    expect(parseQueueView(undefined)).toBe("list");
    expect(parseQueueView(["cards", "list"])).toBe("list");
  });
});
