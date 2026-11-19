"use client";

import { Button } from "./Button";

// The one-tap "Still working, no news" on an in-progress idea's page (#131), in the
// leader panel. Presentational: src/app/_updates/CheckInControl.tsx wires it to the
// posting hook. The button stays focusable while busy (aria-disabled, not disabled), so
// focus does not jump.
export function CheckInButton({
  busy,
  error,
  onCheckIn,
}: {
  busy: boolean;
  error: string | null;
  onCheckIn: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="line" aria-disabled={busy} onClick={onCheckIn}>
        {busy ? "Posting…" : "Still working, no news"}
      </Button>
      <p className="text-sm text-muted">
        Posts a short update students see on this page. It counts as this idea&rsquo;s update for the
        board&rsquo;s schedule.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-accent-text">
          {error}
        </p>
      )}
    </div>
  );
}
