const MAX_LENGTH = 2048;
// A throwaway origin: only used to see whether a value stays on our own site.
const BASE = "https://x.invalid";
const LOOP_PAGES = ["/sign-in", "/stand-in"];

// `next` is untrusted input wherever it appears: the sign-in query, the
// stand-in query, and the stand-in form field. Only same-site relative paths
// survive, which is the open-redirect guard (#93).
export function safeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  // Backslashes and control characters (tab, newline) are read as slashes or
  // dropped by some browsers, which can turn "/\evil.com" into another site.
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;

  const url = new URL(raw, BASE);
  if (url.origin !== BASE) return null;
  // Sign-in never returns to itself, or a signed-out visitor could loop.
  if (LOOP_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`))) return null;
  return url.pathname + url.search + url.hash;
}
