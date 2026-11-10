import type { QueueItem } from "@/core/queue";

// Invented rows for the Ideas tab until its status query (#98) lands. The page reads
// them through queueFor(), the same as the real rows will be read. Pending posts are
// real now (#59): they come from the review queue, not from here.
// Descriptions are here so the card's description line renders (#139).
export const QUEUE_SAMPLE: QueueItem[] = [
  {
    kind: "idea",
    number: 103,
    title: "A student-hosted food pantry",
    boardId: "DAB",
    status: "in_progress",
    supportCount: 412,
    updatedDaysAgo: 2,
    description: "A pantry run by students, stocked with shelf-stable food and open on weekdays.",
  },
  {
    kind: "idea",
    number: 96,
    title: "A late shuttle on Friday nights",
    boardId: "CSC",
    status: "waiting",
    supportCount: 305,
    updatedDaysAgo: 20,
    description: "Add a shuttle after 11pm on Fridays between the library and the residence halls.",
  },
];
