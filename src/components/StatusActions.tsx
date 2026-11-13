"use client";

import { useEffect, useRef } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";
import { Button } from "./Button";

// Start, hold, and deliver, inside the idea page's "For SGA leaders" panel (#98). Shows
// only the buttons that work for the idea's status. Presentational: the caller runs the
// actions and passes back busy, error, and the heads-up.
type Props = {
  status: IdeaStatus;
  waitingReason: string | null;
  board: BoardCode;
  busy: "start" | "hold" | "deliver" | null;
  error: { text: string } | null;
  headsUp: { inProgress: number; guideline: number } | null;
  onStart: () => void;
  onStartAnyway: () => void;
  onDismissHeadsUp: () => void;
  onHold: () => void;
  onDeliver: () => void;
};

const plural = (count: number) => (count === 1 ? "1 idea" : `${count} ideas`);

export function StatusActions({
  status,
  waitingReason,
  board,
  busy,
  error,
  headsUp,
  onStart,
  onStartAnyway,
  onDismissHeadsUp,
  onHold,
  onDeliver,
}: Props) {
  const headsUpText = useRef<HTMLParagraphElement>(null);
  // The buttons are replaced by the heads-up, so focus follows to its text.
  useEffect(() => {
    if (headsUp) headsUpText.current?.focus();
  }, [headsUp]);

  const starting = busy === "start";
  // A click while busy does nothing: aria-disabled keeps the button focusable.
  const start = () => !starting && onStart();

  return (
    <div className="flex flex-col gap-3">
      {headsUp ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p ref={headsUpText} tabIndex={-1} className="font-semibold">
              {headsUp.inProgress === 0
                ? "This is a large idea, so it counts as 2."
                : `The ${BOARDS[board].name} is already working on ${plural(headsUp.inProgress)}.`}
            </p>
            <p className="text-sm text-muted">
              {headsUp.inProgress === 0
                ? `Boards usually work on ${plural(headsUp.guideline)} at a time. Start this one anyway?`
                : `Boards usually work on ${headsUp.guideline === 1 ? "1 idea" : `1 to ${headsUp.guideline} ideas`} at a time, and a large idea counts as 2. Start this one anyway?`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" aria-disabled={starting} onClick={() => !starting && onStartAnyway()}>
              {starting ? "Starting…" : "Start anyway"}
            </Button>
            <Button onClick={onDismissHeadsUp}>Not now</Button>
          </div>
        </div>
      ) : (
        <Buttons
          status={status}
          waitingReason={waitingReason}
          starting={starting}
          delivering={busy === "deliver"}
          onStart={start}
          onHold={onHold}
          onDeliver={onDeliver}
        />
      )}
      {error && (
        <p role="alert" className="font-semibold text-accent-text">
          {error.text}
        </p>
      )}
    </div>
  );
}

function Buttons({
  status,
  waitingReason,
  starting,
  delivering,
  onStart,
  onHold,
  onDeliver,
}: Pick<Props, "status" | "waitingReason" | "onHold" | "onDeliver"> & {
  starting: boolean;
  delivering: boolean;
  onStart: () => void;
}) {
  const startButton = (
    <Button variant="primary" aria-disabled={starting} onClick={onStart}>
      {starting ? "Starting…" : "Start working on this"}
    </Button>
  );
  switch (status) {
    case "collecting_support":
      return (
        <div className="flex flex-wrap gap-2">
          {startButton}
          <Button variant="line" onClick={onHold}>
            Put on hold
          </Button>
        </div>
      );
    case "waiting":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{`Students see: “${waitingReason ?? ""}.”`}</p>
          <div className="flex flex-wrap gap-2">{startButton}</div>
        </div>
      );
    case "in_progress":
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="line" aria-disabled={delivering} onClick={() => !delivering && onDeliver()}>
            {delivering ? "Delivering…" : "Mark delivered"}
          </Button>
        </div>
      );
    case "delivered":
      return <p className="text-sm text-muted">Delivered. It stays on record.</p>;
  }
}
