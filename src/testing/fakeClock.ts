import type { Clock } from "@/core/clock";

// The default start is a Monday morning in Boston, inside the soft-launch window (#43).
export const DEFAULT_FAKE_START = "2026-11-02T14:00:00.000Z";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type FakeClock = Clock & {
  advance(by: { days?: number; hours?: number; minutes?: number }): void;
  set(date: Date | string): void;
};

// Times are UTC. `now()` returns a fresh Date so a caller cannot mutate the clock.
export function createFakeClock(start: Date | string = DEFAULT_FAKE_START): FakeClock {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance({ days = 0, hours = 0, minutes = 0 }) {
      if (days < 0 || hours < 0 || minutes < 0) {
        throw new Error("advance() rejects negative values. Use set() to go back in time.");
      }
      current += days * DAY + hours * HOUR + minutes * MINUTE;
    },
    set(date) {
      current = new Date(date).getTime();
    },
  };
}
