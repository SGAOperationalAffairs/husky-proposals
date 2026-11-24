import { BOARDS, BOARD_CODES, type BoardCode } from "./boards";
import { daysUntil, untilText } from "./days";

// Words for the review screen (#59). Plain functions: no clock, no framework.

// Whole UTC calendar days, the one rule in days.ts (#273).
export function dueText(dueAt: Date, now: Date): { text: string; overdue: boolean } {
  return untilText(daysUntil(dueAt, now), { today: "Due today", ahead: "Due in" });
}

// What an author reads on their own pending post (#200). It says reviewers aim to decide,
// never that they will, so a late review does not break what the page said. Whole UTC days,
// as in dueText.
export function studentWaitText(dueAt: Date | null, now: Date): string {
  if (dueAt === null) return "Reviewers aim to decide within a few days.";
  const days = daysUntil(dueAt, now);
  if (days < 0) {
    return "This is taking longer than usual. It is still waiting for a reviewer, and you do not need to do anything.";
  }
  if (days === 0) return "Reviewers aim to decide today.";
  if (days === 1) return "Reviewers aim to decide by tomorrow.";
  return `Reviewers aim to decide within ${days} days.`;
}

// The reviewer badge: which boards this leader decides. Null when none.
export function reviewerLabel(boards: BoardCode[]): string | null {
  if (boards.length === 0) return null;
  if (boards.length === BOARD_CODES.length) return "You review all five boards";
  const names = boards.map((board) => BOARDS[board].category);
  if (names.length === 1) return `You review ${names[0]}`;
  if (names.length === 2) return `You review ${names[0]} and ${names[1]}`;
  return `You review ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
