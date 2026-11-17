import { describe, expect, it } from "vitest";
import {
  CONTACT_DAYS,
  contactBy,
  countByStatus,
  filterPeople,
  ideaChoicesFor,
  peopleForViewer,
  toListStatus,
  type PersonRow,
} from "./people";
import type { Viewer } from "./permissions";

// The People list (#129). Pure rules: which rows a viewer may see, how a participation's
// contact status maps to the list's filters, and the contact date.

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-20T12:00:00Z");

const chair = (board: "DAB" | "CPAB"): Viewer => ({
  user: { id: "chair" },
  roles: { vpCampusAffairs: false, leads: [board], memberOf: [] },
});
const vp: Viewer = { user: { id: "vp" }, roles: { vpCampusAffairs: true, leads: [], memberOf: [] } };
const student: Viewer = { user: { id: "s" }, roles: { vpCampusAffairs: false, leads: [], memberOf: [] } };

function row(over: Partial<PersonRow> & Pick<PersonRow, "board">): PersonRow {
  return {
    userId: "u",
    ideaId: "i",
    ideaNumber: 103,
    ideaTitle: "Later dining hours",
    name: "Ava Chen",
    email: "ava@husky.example",
    contactStatus: "new",
    signedUpAt: new Date(NOW.getTime() - DAY),
    contactedAt: null,
    ...over,
  };
}

describe("toListStatus", () => {
  it("maps the four participation statuses to the list's filters", () => {
    expect(toListStatus("new")).toBe("to_contact");
    expect(toListStatus("contacted")).toBe("contacted");
    expect(toListStatus("joined")).toBe("joined");
    expect(toListStatus("later")).toBe("not_now");
  });
});

describe("contactBy", () => {
  it("is CONTACT_DAYS after signing up", () => {
    expect(CONTACT_DAYS).toBe(3);
    expect(contactBy(new Date(NOW.getTime() - DAY)).getTime()).toBe(NOW.getTime() + 2 * DAY);
  });
});

describe("peopleForViewer", () => {
  const rows = [row({ board: "DAB" }), row({ board: "CPAB", userId: "u2" })];

  it("a chair sees only their own board's people", () => {
    expect(peopleForViewer(chair("DAB"), rows).map((r) => r.board)).toEqual(["DAB"]);
  });

  it("the VP sees every board", () => {
    expect(peopleForViewer(vp, rows)).toHaveLength(2);
  });

  it("a student sees nobody", () => {
    expect(peopleForViewer(student, rows)).toEqual([]);
    expect(peopleForViewer(null, rows)).toEqual([]);
  });
});

describe("filterPeople and countByStatus", () => {
  const rows = [
    row({ board: "DAB", userId: "a", contactStatus: "new", signedUpAt: new Date(NOW.getTime() - 5 * DAY) }),
    row({ board: "DAB", userId: "b", contactStatus: "contacted", ideaId: "j", ideaNumber: 118 }),
    row({ board: "CPAB", userId: "c", contactStatus: "joined" }),
  ];

  it("filters by status, idea, and board", () => {
    expect(filterPeople(rows, { status: "to_contact", idea: "all", board: "all" }, NOW)).toHaveLength(1);
    expect(
      filterPeople(rows, { status: "all", idea: "118", board: "all" }, NOW).map((r) => r.userId),
    ).toEqual(["b"]);
    expect(filterPeople(rows, { status: "all", idea: "all", board: "CPAB" }, NOW)).toHaveLength(1);
  });

  it("sorts overdue first, then the nearest contact date", () => {
    const sorted = filterPeople(rows, { status: "all", idea: "all", board: "all" }, NOW);
    expect(sorted[0]).toMatchObject({ userId: "a" });
  });

  it("counts each status for the filter labels, inside the chosen idea and board", () => {
    expect(countByStatus(rows, { idea: "all", board: "all" })).toEqual({
      to_contact: 1,
      contacted: 1,
      joined: 1,
      not_now: 0,
      all: 3,
    });
    expect(countByStatus(rows, { idea: "all", board: "DAB" }).all).toBe(2);
  });
});

describe("ideaChoicesFor", () => {
  const rows = [
    row({ board: "DAB", ideaNumber: 118, ideaTitle: "Bike racks", userId: "a" }),
    row({ board: "DAB", ideaNumber: 103, ideaTitle: "Later dining hours", userId: "b" }),
    row({ board: "CPAB", ideaNumber: 130, ideaTitle: "Study rooms", userId: "c" }),
    row({ board: "DAB", ideaNumber: 103, ideaTitle: "Later dining hours", userId: "d" }),
  ];

  it("lists each idea once, in number order, for every board when none is chosen", () => {
    expect(ideaChoicesFor(rows, "all").map((i) => i.number)).toEqual([103, 118, 130]);
  });

  it("lists only the chosen board's ideas", () => {
    expect(ideaChoicesFor(rows, "DAB")).toEqual([
      { number: 103, title: "Later dining hours", board: "DAB" },
      { number: 118, title: "Bike racks", board: "DAB" },
    ]);
    expect(ideaChoicesFor(rows, "CPAB").map((i) => i.number)).toEqual([130]);
  });
});
