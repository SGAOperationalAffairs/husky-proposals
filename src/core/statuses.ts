// An idea's status once approved, and the words students see for it (CLAUDE.md,
// "Statuses"). statuses.test.ts pins these to the Prisma enum (#34).
export type IdeaStatus = "collecting_support" | "under_review" | "in_progress" | "delivered" | "waiting";

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  collecting_support: "Collecting support",
  under_review: "Under review",
  in_progress: "In progress",
  delivered: "Delivered",
  waiting: "Waiting",
};

export const IDEA_STATUSES = Object.keys(STATUS_LABELS) as IdeaStatus[];
