// The board's soft in-progress guideline (#98). Boards usually work on 1 to 2 ideas at
// a time, and a large idea counts as 2. This only decides whether to show a heads-up:
// it never blocks a start. Pure: no clock, no throws.

// Mirrors the IdeaScale enum. An unknown or missing scale counts as 1.
function weight(scale: string | null): number {
  return scale === "large" ? 2 : 1;
}

export function boardLoad(scales: readonly (string | null)[]): number {
  return scales.reduce((total, scale) => total + weight(scale), 0);
}

export type HeadsUp = { inProgress: number; guideline: number };

// `inProgress` is a count of ideas, which is what the copy says; the comparison uses load.
export function startHeadsUp({
  inProgressScales,
  guideline,
  scale,
}: {
  inProgressScales: readonly (string | null)[];
  guideline: number;
  scale: string | null;
}): HeadsUp | null {
  if (boardLoad(inProgressScales) + weight(scale) <= guideline) return null;
  return { inProgress: inProgressScales.length, guideline };
}
