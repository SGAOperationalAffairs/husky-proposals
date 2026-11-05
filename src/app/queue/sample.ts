import type { QueueItem } from "@/core/queue";

// Invented rows for the Ideas tab until its status query (#98) lands. The page reads
// them through queueFor(), the same as the real rows will be read. Pending posts are
// real now (#59): they come from the review queue, not from here.
export const QUEUE_SAMPLE: QueueItem[] = [
  {
    kind: "idea",
    number: 103,
    title: "A student-hosted food pantry",
    boardId: "DAB",
    status: "in_progress",
    supportCount: 412,
    updatedDaysAgo: 2,
  },
  {
    kind: "idea",
    number: 96,
    title: "A late shuttle on Friday nights",
    boardId: "CSC",
    status: "waiting",
    supportCount: 305,
    updatedDaysAgo: 20,
  },
];
