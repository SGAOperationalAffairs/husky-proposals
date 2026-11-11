// The rules behind the on-screen error floater (#191). Plain TypeScript: no React,
// no Next, no clock reads. The floater shows errors only where the gate says so
// (dev, preview, and the browser-test server), never in production.

export type ErrorSource = "action" | "route" | "client" | "sgauth";

export const ERROR_SOURCE_LABELS: Record<ErrorSource, string> = {
  action: "Action",
  route: "Page",
  client: "Browser",
  sgauth: "SGAuth",
};

export type ErrorReport = { source: ErrorSource; message: string };

// Times are ISO strings so an entry is plain data.
export type ErrorEntry = {
  key: string;
  source: ErrorSource;
  message: string;
  count: number;
  firstAt: string;
  lastAt: string;
};

export const MAX_ENTRIES = 20;
const MAX_MESSAGE = 500;

// What a server action returns on dev and preview when it threw (#191). `report`
// carries the text the floater shows; production never returns this.
export type Unexpected = { ok: false; error: { code: "unexpected"; report?: { message: string } } };

// The floater shows on dev and preview, and on `test`, the browser-test server that is
// never deployed. `local` stays off because Next's own dev overlay shows these in full.
export function showsErrors(appEnv: string): boolean {
  return appEnv === "dev" || appEnv === "preview" || appEnv === "test";
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

// One line of text for anything that can be thrown or rejected.
export function normalizeError(value: unknown): string {
  let text: string;
  if (value instanceof Error) {
    const digest = (value as { digest?: unknown }).digest;
    text = typeof digest === "string" ? `${value.message} (digest ${digest})` : value.message;
  } else if (typeof value === "string") {
    text = value;
  } else {
    text = stringify(value);
  }
  text = text.trim();
  if (text === "") return "Unknown error";
  return text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE - 1)}…` : text;
}

// The same source and message is one entry with a count. The newest entry is first.
export function addReport(entries: readonly ErrorEntry[], report: ErrorReport, now: Date): ErrorEntry[] {
  const key = `${report.source}:${report.message}`;
  const iso = now.toISOString();
  const existing = entries.find((entry) => entry.key === key);
  const entry: ErrorEntry = existing
    ? { ...existing, count: existing.count + 1, lastAt: iso }
    : { key, source: report.source, message: report.message, count: 1, firstAt: iso, lastAt: iso };
  return [entry, ...entries.filter((other) => other.key !== key)].slice(0, MAX_ENTRIES);
}

export function dismissEntry(entries: readonly ErrorEntry[], key: string): ErrorEntry[] {
  return entries.filter((entry) => entry.key !== key);
}
