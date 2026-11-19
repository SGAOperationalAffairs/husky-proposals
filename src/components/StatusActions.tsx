"use client";

import { CircleCheck, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";
import { Button } from "./Button";

// Start, Hold, Finish, and Reopen, inside the idea page's "For SGA leaders" panel (#98,
// #126). Full-width buttons with an icon, and only the ones that work for the idea's
// status. Presentational: the caller runs the actions and passes back busy, error, and
// the heads-up.
type Props = {
  status: IdeaStatus;
  waitingReason: string | null;
  closedReason: string | null;
  board: BoardCode;
  busy: "start" | "hold" | "deliver" | "close" | "reopen" | null;
  error: { text: string } | null;
  headsUp: { for: "start" | "reopen"; inProgress: number; guideline: number } | null;
  onStart: () => void;
  onReopen: () => void;
  onConfirmHeadsUp: () => void;
  onDismissHeadsUp: () => void;
  onHold: () => void;
  onFinish: () => void;
};

const plural = (count: number) => (count === 1 ? "1 idea" : `${count} ideas`);

export function StatusActions({
  status,
  waitingReason,
  closedReason,
  board,
  busy,
  error,
  headsUp,
  onStart,
  onReopen,
  onConfirmHeadsUp,
  onDismissHeadsUp,
  onHold,
  onFinish,
}: Props) {
  const headsUpText = useRef<HTMLParagraphElement>(null);
  // The buttons are replaced by the heads-up, so focus follows to its text.
  useEffect(() => {
    if (headsUp) headsUpText.current?.focus();
  }, [headsUp]);

  const starting = busy === "start";
  const reopening = busy === "reopen";
  // A click while busy does nothing: aria-disabled keeps the button focusable.
  const start = () => !starting && onStart();
  const reopen = () => !reopening && onReopen();

  const headsUpBusy = headsUp?.for === "reopen" ? reopening : starting;
  const verb = headsUp?.for === "reopen" ? "Reopen" : "Start";

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
                ? `Boards usually work on ${plural(headsUp.guideline)} at a time. ${verb} this one anyway?`
                : `Boards usually work on ${headsUp.guideline === 1 ? "1 idea" : `1 to ${headsUp.guideline} ideas`} at a time, and a large idea counts as 2. ${verb} this one anyway?`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              aria-disabled={headsUpBusy}
              onClick={() => !headsUpBusy && onConfirmHeadsUp()}
            >
              {headsUpBusy ? (verb === "Reopen" ? "Reopening…" : "Starting…") : `${verb} anyway`}
            </Button>
            <Button onClick={onDismissHeadsUp}>Not now</Button>
          </div>
        </div>
      ) : (
        <Buttons
          status={status}
          waitingReason={waitingReason}
          closedReason={closedReason}
          starting={starting}
          reopening={reopening}
          onStart={start}
          onReopen={reopen}
          onHold={onHold}
          onFinish={onFinish}
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
  closedReason,
  starting,
  reopening,
  onStart,
  onReopen,
  onHold,
  onFinish,
}: Pick<Props, "status" | "waitingReason" | "closedReason" | "onHold" | "onFinish"> & {
  starting: boolean;
  reopening: boolean;
  onStart: () => void;
  onReopen: () => void;
}) {
  const startButton = (
    <Button
      variant="primary"
      className="w-full"
      icon={<Play className="size-4" />}
      aria-disabled={starting}
      onClick={onStart}
    >
      {starting ? "Starting…" : "Start"}
    </Button>
  );
  const reopenButton = (
    <Button
      variant="line"
      className="w-full"
      icon={<RotateCcw className="size-4" />}
      aria-disabled={reopening}
      onClick={onReopen}
    >
      {reopening ? "Reopening…" : "Reopen"}
    </Button>
  );
  switch (status) {
    case "collecting_support":
      return <div className="flex flex-col gap-2">{startButton}</div>;
    case "waiting":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{`Students see: “${waitingReason ?? ""}.”`}</p>
          {startButton}
        </div>
      );
    case "in_progress":
      return (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full"
            icon={<CircleCheck className="size-4" />}
            onClick={onFinish}
          >
            Finish
          </Button>
          <Button variant="line" className="w-full" icon={<Pause className="size-4" />} onClick={onHold}>
            Hold
          </Button>
        </div>
      );
    case "delivered":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Delivered. Reopen it if work picks back up.</p>
          {reopenButton}
        </div>
      );
    case "closed":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{`Closed. Students see: “${closedReason ?? ""}.”`}</p>
          {reopenButton}
        </div>
      );
  }
}
