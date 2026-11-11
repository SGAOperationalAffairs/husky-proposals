"use client";

import { useSyncExternalStore } from "react";
import { clearAll, dismiss, getServerSnapshot, getSnapshot, subscribe } from "./reports";

// The error floater's one hook (#191): the page session's reports and how to dismiss them.
export function useErrorReports() {
  const { entries, latest } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { entries, latest, dismiss, clearAll };
}
