// Sample records for the Updates page, for runs with no database (usesSampleIdeas). Invented
// ideas and made-up updates; no real data. The shape is what listUpdatableIdeas returns, with
// every time worked out from `now`, so the due flags are the same on any day.
import type { BoardCode } from "@/core/boards";
import type { UpdatableIdea } from "@/db/updatesList";

const DAY = 24 * 60 * 60 * 1000;
const CADENCE_DAYS = 30;

type Sample = {
  number: number;
  title: string;
  board: BoardCode;
  followers: number;
  supporters: number;
  // Newest first, as [days ago, text].
  updates: [number, string][];
};

const SAMPLES: Sample[] = [
  {
    number: 103,
    title: "Later dining hours on Sundays",
    board: "DAB",
    followers: 31,
    supporters: 58,
    updates: [
      [34, "Still working, no news."],
      [60, "Met with dining services."],
    ],
  },
  {
    number: 118,
    title: "A longer walk signal at Huntington and Forsyth",
    board: "CPAB",
    followers: 24,
    supporters: 40,
    updates: [[9, "Met with the city engineer."]],
  },
  {
    number: 131,
    title: "Refill stations on every floor",
    board: "GIB",
    followers: 18,
    supporters: 27,
    updates: [[4, "Survey goes out this week."]],
  },
  {
    number: 137,
    title: "Bike repair stand outside the Marino library",
    board: "CPAB",
    followers: 22,
    supporters: 35,
    updates: [[12, "Quote came back from the vendor."]],
  },
  {
    number: 142,
    title: "Vegetarian options at every station in the dining hall",
    board: "DAB",
    followers: 47,
    supporters: 88,
    updates: [
      [40, "Menu review is on the calendar."],
      [75, "Survey results shared with the board."],
    ],
  },
  {
    number: 149,
    title: "Compost bins in every residence hall lounge",
    board: "SC",
    followers: 29,
    supporters: 44,
    updates: [[2, "Bins ordered for three halls."]],
  },
  {
    number: 155,
    title: "Extended hours at the Snell Library study rooms during finals",
    board: "CPAB",
    followers: 36,
    supporters: 61,
    updates: [[28, "Talked with library staff."]],
  },
  {
    number: 166,
    title: "Late-night shuttle from the Curry Student Center",
    board: "CSC",
    followers: 41,
    supporters: 70,
    updates: [[6, "Route survey is underway."]],
  },
  {
    number: 171,
    title: "Free menstrual products in every restroom on campus",
    board: "CSC",
    followers: 52,
    supporters: 97,
    updates: [[33, "Vendor pricing requested."]],
  },
];

export function sampleUpdateRows(now: Date): UpdatableIdea[] {
  const ago = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
  return SAMPLES.map((s) => {
    const newest = s.updates[0]?.[0] ?? 0;
    return {
      id: `00000000-0000-4000-8000-${String(s.number).padStart(12, "0")}`,
      number: s.number,
      title: s.title,
      boardId: s.board,
      statusChangedAt: ago(90),
      cadenceDays: CADENCE_DAYS,
      supportCount: s.supporters,
      followerCount: s.followers,
      isStale: newest >= CADENCE_DAYS,
      lastUpdateAt: s.updates[0] ? ago(s.updates[0][0]) : null,
      updates: s.updates.map(([days, body], i) => ({
        id: `00000000-0000-4000-9000-${String(s.number * 10 + i).padStart(12, "0")}`,
        kind: body === "Still working, no news." ? ("check_in" as const) : ("board" as const),
        body,
        createdAt: ago(days),
      })),
    };
  });
}
