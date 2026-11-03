import type { QueueItem } from "@/core/queue";

// Invented queue rows until the review and status queries (#58, #98) land. The
// page reads them through queueFor(), the same as the real rows will be read.
export const QUEUE_SAMPLE: QueueItem[] = [
  {
    kind: "post",
    number: 201,
    title: "Late-night study space in the library",
    boardId: "CPAB",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 1,
  },
  {
    kind: "post",
    number: 202,
    title: "Free bike repair stand on the quad",
    boardId: "GIB",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 3,
  },
  {
    kind: "post",
    number: 203,
    title: "Reusable containers at dining halls",
    boardId: "DAB",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 4,
  },
  {
    kind: "post",
    number: 204,
    title: "Later campus shuttle on weekends",
    boardId: "CSC",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 5,
  },
  {
    kind: "post",
    number: 205,
    title: "Solar canopy study for the commuter lot",
    boardId: "SC",
    status: "pending",
    supportCount: 0,
    updatedDaysAgo: 6,
  },
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
