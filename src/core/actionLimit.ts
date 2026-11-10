// The abuse limit shared by every student action: support, participate, follow (#94).
// A script-level cap far above what a person does, in a fixed one-minute window. A burst
// can reach about twice the limit across a minute boundary, which is fine at this size.
export const ACTION_LIMIT = 60;

const MINUTE = 60 * 1000;

// The UTC minute `now` falls in.
export function windowStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / MINUTE) * MINUTE);
}

export type ActionLimitResult = { ok: true } | { ok: false; error: { code: "rate_limited" } };

// `count` is the minute's count after this change was counted.
export function checkActionCount(count: number): ActionLimitResult {
  return count <= ACTION_LIMIT ? { ok: true } : { ok: false, error: { code: "rate_limited" } };
}
