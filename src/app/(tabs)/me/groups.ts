// The My ideas groups (#193). A pure function, so the rules are tested without
// the page. The rows come from the student's own queries (#97); until those land,
// sample rows stand in (sample.ts).
import type { BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";

export type MyRow = {
  number: number;
  title: string;
  board: BoardCode;
  // Only approved ideas have a public status. Pending and declined posts have none.
  status: IdeaStatus | null;
  review: "approved" | "pending" | "declined";
  posted: boolean;
  supported: boolean;
  participated: boolean;
  submittedAt: number;
  declineReason?: string;
  // What the idea card shows (#193). Pending and declined posts show only the
  // description; the counts are for approved ideas.
  description: string;
  supportCount: number;
  willingCount: number;
  updatedDaysAgo: number;
};

export type MyGroups = {
  written: MyRow[];
  supported: MyRow[];
  participated: MyRow[];
};

// An idea can sit in more than one tab: a student may support an idea and also
// tap "I'll participate" on it. Each tab is newest first.
export function groupMyIdeas(rows: MyRow[]): MyGroups {
  const newestFirst = (a: MyRow, b: MyRow) => b.submittedAt - a.submittedAt;
  return {
    written: rows.filter((r) => r.posted).sort(newestFirst),
    supported: rows.filter((r) => r.supported).sort(newestFirst),
    participated: rows.filter((r) => r.participated).sort(newestFirst),
  };
}
