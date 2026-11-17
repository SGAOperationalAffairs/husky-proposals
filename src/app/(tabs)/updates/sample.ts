// Sample rows for the Updates page, until the update queries (#130) land. Invented ideas
// and made-up updates; no real data. The shape is what the page will read.
import type { BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";

export type UpdateRow = {
  number: number;
  title: string;
  board: BoardCode;
  status: IdeaStatus;
  // Days since the last update, and the update's text.
  daysSince: number;
  last: string;
  past: { daysAgo: number; text: string }[];
  fol: number;
  sup: number;
};

export function sampleUpdateRows(): UpdateRow[] {
  return [
    {
      number: 103,
      title: "Later dining hours on Sundays",
      board: "DAB",
      status: "in_progress",
      daysSince: 34,
      last: "Still working, no news",
      past: [
        { daysAgo: 34, text: "Still working, no news" },
        { daysAgo: 60, text: "Met with dining services." },
      ],
      fol: 31,
      sup: 58,
    },
    {
      number: 118,
      title: "A longer walk signal at Huntington and Forsyth",
      board: "CPAB",
      status: "in_progress",
      daysSince: 9,
      last: "Met with the city engineer.",
      past: [{ daysAgo: 9, text: "Met with the city engineer." }],
      fol: 24,
      sup: 40,
    },
    {
      number: 124,
      title: "Free print credits each semester",
      board: "CSC",
      status: "waiting",
      daysSince: 31,
      last: "Waiting on the printing budget.",
      past: [{ daysAgo: 31, text: "Waiting on the printing budget." }],
      fol: 12,
      sup: 19,
    },
    {
      number: 131,
      title: "Refill stations on every floor",
      board: "GIB",
      status: "in_progress",
      daysSince: 4,
      last: "Survey goes out this week.",
      past: [{ daysAgo: 4, text: "Survey goes out this week." }],
      fol: 18,
      sup: 27,
    },
    {
      number: 137,
      title: "Bike repair stand outside the Marino library",
      board: "CPAB",
      status: "in_progress",
      daysSince: 12,
      last: "Quote came back from the vendor.",
      past: [{ daysAgo: 12, text: "Quote came back from the vendor." }],
      fol: 22,
      sup: 35,
    },
    {
      number: 142,
      title: "Vegetarian options at every station in the dining hall",
      board: "DAB",
      status: "in_progress",
      daysSince: 40,
      last: "Menu review is on the calendar.",
      past: [
        { daysAgo: 40, text: "Menu review is on the calendar." },
        { daysAgo: 75, text: "Survey results shared with the board." },
      ],
      fol: 47,
      sup: 88,
    },
    {
      number: 149,
      title: "Compost bins in every residence hall lounge",
      board: "SC",
      status: "in_progress",
      daysSince: 2,
      last: "Bins ordered for three halls.",
      past: [{ daysAgo: 2, text: "Bins ordered for three halls." }],
      fol: 29,
      sup: 44,
    },
    {
      number: 155,
      title: "Extended hours at the Snell Library study rooms during finals",
      board: "CPAB",
      status: "in_progress",
      daysSince: 28,
      last: "Talked with library staff.",
      past: [{ daysAgo: 28, text: "Talked with library staff." }],
      fol: 36,
      sup: 61,
    },
    {
      number: 160,
      title: "Water bottle refill stations at the gym",
      board: "GIB",
      status: "waiting",
      daysSince: 18,
      last: "Waiting on facilities approval.",
      past: [{ daysAgo: 18, text: "Waiting on facilities approval." }],
      fol: 16,
      sup: 23,
    },
    {
      number: 166,
      title: "Late-night shuttle from the Curry Student Center",
      board: "CSC",
      status: "in_progress",
      daysSince: 6,
      last: "Route survey is underway.",
      past: [{ daysAgo: 6, text: "Route survey is underway." }],
      fol: 41,
      sup: 70,
    },
    {
      number: 171,
      title: "Free menstrual products in every restroom on campus",
      board: "CSC",
      status: "in_progress",
      daysSince: 33,
      last: "Vendor pricing requested.",
      past: [{ daysAgo: 33, text: "Vendor pricing requested." }],
      fol: 52,
      sup: 97,
    },
  ];
}
