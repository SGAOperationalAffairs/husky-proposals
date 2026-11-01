// Core takes a Clock (or a plain `now: Date`) as input instead of reading the
// time, so review due dates (T0.8) and update cadence (E8) are testable with a
// fake clock (#43). This is the one file in src/core allowed to read the time;
// a lint rule bans it everywhere else.
export type Clock = { now(): Date };

export const systemClock: Clock = {
  now: () => new Date(),
};
