import { BOARDS, BOARD_CODES, type BoardCode } from "./boards";

// Words for the review screen (#59). Plain functions: no clock, no framework.

const DAY = 24 * 60 * 60 * 1000;
const utcDay = (date: Date) => Math.floor(date.getTime() / DAY);

// Whole calendar days on UTC boundaries, to match reviewDueAt's whole-day math. The
// words carry the meaning, so overdue is never shown by color alone.
export function dueText(dueAt: Date, now: Date): { text: string; overdue: boolean } {
  const days = utcDay(dueAt) - utcDay(now);
  if (days === 0) return { text: "Due today", overdue: false };
  if (days > 0) return { text: `Due in ${days} ${days === 1 ? "day" : "days"}`, overdue: false };
  const late = -days;
  return { text: `${late} ${late === 1 ? "day" : "days"} overdue`, overdue: true };
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
