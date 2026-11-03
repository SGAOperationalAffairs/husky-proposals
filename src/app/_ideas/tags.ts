// Cache tags for the public reads (#60). `ideas` covers the wall and every idea page;
// `idea:<number>` covers one page. Named tags only, never implicit caching (CLAUDE.md).
export const IDEAS_TAG = "ideas";
export const ideaTag = (number: number): string => `idea:${number}`;
