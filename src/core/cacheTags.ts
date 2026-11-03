// The names of the public cache tags (#58). Plain strings so core and tests can use
// them without importing Next. The public pages (#60) cache under these, and the
// review actions refresh them when an idea becomes public or stops being public.
export const IDEAS_TAG = "ideas";

export function ideaTag(number: number): string {
  return `idea:${number}`;
}
