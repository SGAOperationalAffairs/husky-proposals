import {
  addReport,
  dismissEntry,
  ERROR_SOURCE_LABELS,
  normalizeError,
  type ErrorEntry,
  type ErrorSource,
} from "@/core/errorReport";

// The page-session store behind the error floater (#191). Nothing is saved anywhere:
// it lives in the browser tab and is gone on reload. No React here; the one hook is
// useErrorReports. Every catch point calls reportError, which does nothing until the
// floater (mounted only where the gate allows) has enabled it, so production keeps nothing.
export type ReportsSnapshot = { entries: readonly ErrorEntry[]; latest: string };

const EMPTY: ReportsSnapshot = { entries: [], latest: "" };

let snapshot = EMPTY;
let enabled = false;
// Bumped on every report, so the live region's text changes even for a repeat.
let sequence = 0;
const listeners = new Set<() => void>();

function set(next: ReportsSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function enableReports(): () => void {
  enabled = true;
  return () => {
    enabled = false;
    snapshot = EMPTY;
    sequence = 0;
  };
}

export function reportError(source: ErrorSource, value: unknown): void {
  if (!enabled) return;
  const message = normalizeError(value);
  sequence += 1;
  // A zero-width space on every other report keeps a repeat's text different, so the
  // live region announces it again.
  const repeatMark = sequence % 2 === 0 ? "​" : "";
  set({
    entries: addReport(snapshot.entries, { source, message }, new Date()),
    latest: `Error from ${ERROR_SOURCE_LABELS[source]}: ${message}${repeatMark}`,
  });
}

// For a server action's result: only an `unexpected` one that carries a report counts.
export function reportActionOutcome(outcome: {
  ok: boolean;
  error?: { code: string; report?: { message: string } };
}) {
  if (outcome.ok || outcome.error?.code !== "unexpected" || !outcome.error.report) return;
  reportError("action", outcome.error.report.message);
}

export function dismiss(key: string): void {
  set({ ...snapshot, entries: dismissEntry(snapshot.entries, key) });
}

export function clearAll(): void {
  set({ ...snapshot, entries: [] });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function getSnapshot(): ReportsSnapshot {
  return snapshot;
}

export function getServerSnapshot(): ReportsSnapshot {
  return EMPTY;
}
