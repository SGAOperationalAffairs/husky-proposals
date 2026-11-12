// An idea's status once approved, and the words students see for it (CLAUDE.md,
// "Statuses"). statuses.test.ts checks these against the Prisma enum (#34).
export type IdeaStatus = "collecting_support" | "in_progress" | "delivered" | "waiting";

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  collecting_support: "Collecting support",
  in_progress: "In progress",
  delivered: "Delivered",
  waiting: "On hold",
};

export const IDEA_STATUSES = Object.keys(STATUS_LABELS) as IdeaStatus[];
