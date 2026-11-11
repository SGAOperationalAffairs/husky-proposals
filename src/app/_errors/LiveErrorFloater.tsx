"use client";

import { useEffect } from "react";
import { ErrorFloater } from "@/components/ErrorFloater";
import { enableReports, reportError } from "./reports";
import { useErrorReports } from "./useErrorReports";

// Mounted only where the gate allows (ErrorFloaterSlot, #191). It switches the store on,
// listens for what the browser throws or rejects, and reports a problem the server found
// with the SGAuth session (`sgauthProblem`, a code only) so every page shows it, /post included.
export function LiveErrorFloater({ sgauthProblem }: { sgauthProblem: string | null }) {
  const { entries, latest, dismiss, clearAll } = useErrorReports();

  useEffect(() => {
    const disable = enableReports();
    const onError = (event: ErrorEvent) => reportError("client", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError("client", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // Reported once per mount, after the store is on.
    if (sgauthProblem) reportError("sgauth", `SGAuth session: ${sgauthProblem}`);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      disable();
    };
  }, [sgauthProblem]);

  return <ErrorFloater entries={entries} latest={latest} onDismiss={dismiss} onClearAll={clearAll} />;
}
