// The one day rule (#273). Every "N days" the app shows is a whole UTC calendar-day count,
// so the same moment reads the same on every page. Plain functions with no clock.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Exact elapsed time, for deadlines and cutoffs. Negative days go back.
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// The number of UTC midnights between two moments. Negative when `to` is earlier.
export function utcDayDiff(from: Date, to: Date): number {
  return Math.floor(to.getTime() / DAY_MS) - Math.floor(from.getTime() / DAY_MS);
}

// Days until a date. Negative means it has passed.
export function daysUntil(date: Date, now: Date): number {
  return utcDayDiff(now, date);
}

// Days since a moment. Never below 0, so clock skew cannot show a negative age.
export function daysAgo(then: Date, now: Date): number {
  return Math.max(0, utcDayDiff(then, now));
}

export const dayCount = (days: number): string => {
  const n = Math.abs(days);
  return `${n} ${n === 1 ? "day" : "days"}`;
};

// The words for a deadline. The words carry the meaning, so overdue is never shown by color alone.
export function untilText(
  days: number,
  words: { today: string; ahead: string },
): { text: string; overdue: boolean } {
  if (days < 0) return { text: `${dayCount(days)} overdue`, overdue: true };
  if (days === 0) return { text: words.today, overdue: false };
  return { text: `${words.ahead} ${dayCount(days)}`, overdue: false };
}

// Dates read as people say them (docs/DESIGN.md, "Copy and tone").
export const daysAgoText = (days: number): string =>
  days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
