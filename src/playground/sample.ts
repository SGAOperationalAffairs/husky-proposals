import type { IdeaCardData } from "@/components/IdeaCard";
import type { QueueRowData } from "@/components/QueueRow";

// Invented sample content, from the prototype's sample ideas (#29).
export const IDEAS: IdeaCardData[] = [
  {
    number: 103,
    title: "A student-hosted food pantry",
    description:
      "A free, stigma-free place to pick up groceries and essentials, hosted by an existing campus office.",
    location: "Curry Student Center",
    boardTag: "Dining",
    status: "in_progress",
    updatedDaysAgo: 2,
    supportCount: 412,
    willingCount: 38,
  },
  {
    number: 131,
    title: "A late-night dining option on weeknights",
    description: "Keep one dining location open later for students coming out of labs and libraries.",
    location: "Stetson East",
    boardTag: "Dining",
    status: "collecting_support",
    updatedDaysAgo: 9,
    supportCount: 233,
    willingCount: 21,
  },
  {
    number: 140,
    title: "More water bottle refill stations in Snell",
    description: "Add refill stations on the quiet floors, where the nearest one is two floors away.",
    location: "Snell Library",
    boardTag: "Sustainability",
    status: "waiting",
    fromSga: true,
    updatedDaysAgo: 14,
    supportCount: 98,
    willingCount: 9,
  },
];

export const QUEUE: QueueRowData[] = [
  {
    rank: 1,
    number: 103,
    title: "A student-hosted food pantry",
    boardTag: "DAB",
    supportCount: 412,
    willingCount: 38,
    ageDays: 62,
    status: "in_progress",
  },
  {
    rank: 2,
    number: 131,
    title: "A late-night dining option on weeknights",
    boardTag: "DAB",
    supportCount: 233,
    willingCount: 21,
    ageDays: 40,
    status: "collecting_support",
  },
  {
    rank: 3,
    number: 132,
    title: "Label halal and kosher options at every station",
    boardTag: "DAB",
    supportCount: 187,
    willingCount: 15,
    ageDays: 30,
    status: "under_review",
  },
  {
    rank: 4,
    number: 118,
    title: "Compost bins outside residence halls",
    boardTag: "SC",
    supportCount: 120,
    willingCount: 10,
    ageDays: 45,
    status: "in_progress",
    stale: true,
  },
];

export const CATEGORIES = [
  "All",
  "Dining",
  "Campus Planning",
  "Campus Services",
  "Green Initiatives",
  "Sustainability",
];
