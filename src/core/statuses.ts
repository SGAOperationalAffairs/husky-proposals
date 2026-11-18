// An idea's status once approved, and the words students see for it (CLAUDE.md,
// "Statuses"). statuses.test.ts checks these against the Prisma enum (#34).
export type IdeaStatus = "collecting_support" | "in_progress" | "delivered" | "waiting" | "closed";

// closed is last so the order of the rest is unchanged (#237).
export const STATUS_LABELS: Record<IdeaStatus, string> = {
  collecting_support: "Collecting support",
  in_progress: "In progress",
  delivered: "Delivered",
  waiting: "On hold",
  closed: "Closed",
};

export const IDEA_STATUSES = Object.keys(STATUS_LABELS) as IdeaStatus[];

// The statuses a student can filter the wall by. Closed ideas are off the wall (#237).
export const WALL_STATUSES: readonly IdeaStatus[] = IDEA_STATUSES.filter((status) => status !== "closed");

// One rule for support, "I'll participate", rank wording, and past-tense counts: a
// delivered or closed idea keeps its numbers as history and takes no more (#237).
export function takesSupport(status: IdeaStatus): boolean {
  return status !== "delivered" && status !== "closed";
}
