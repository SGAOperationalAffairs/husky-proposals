"use client";

import { useRef, useState } from "react";
import { DeliverDialog } from "@/components/DeliverDialog";
import { HoldDialog } from "@/components/HoldDialog";
import { LEADER_PANEL_HEADING_ID } from "@/components/LeaderIdeaPanel";
import { StatusActions } from "@/components/StatusActions";
import type { BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";
import { useStatusActions } from "./useStatusActions";

// The idea page's status controls (#98): the buttons, the hold and deliver dialogs,
// and the hook. A dialog returns focus to the button that opened it. When the status
// changes that button may be gone, so focus goes to the panel's heading instead.
type Dialog = "hold" | "deliver" | null;

export function IdeaStatusControls({
  ideaId,
  number,
  board,
  status,
  waitingReason,
}: {
  ideaId: string;
  number: number;
  board: BoardCode;
  status: IdeaStatus;
  waitingReason: string | null;
}) {
  const actions = useStatusActions();
  const [open, setOpen] = useState<Dialog>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const target = { id: ideaId, number, boardId: board };

  const opener = (which: Exclude<Dialog, null>) => () => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    actions.clearError();
    setOpen(which);
  };
  const done = (ok: boolean) => {
    if (!ok) return;
    returnFocus.current = document.getElementById(LEADER_PANEL_HEADING_ID);
    setOpen(null);
  };

  return (
    <>
      <StatusActions
        status={status}
        waitingReason={waitingReason}
        board={board}
        busy={actions.busy}
        // The dialogs show their own failures while open.
        error={open ? null : actions.error}
        headsUp={actions.headsUp}
        onStart={async () => {
          const ok = await actions.start(target);
          if (ok) document.getElementById(LEADER_PANEL_HEADING_ID)?.focus();
        }}
        onStartAnyway={async () => {
          const ok = await actions.startAnyway(target);
          if (ok) document.getElementById(LEADER_PANEL_HEADING_ID)?.focus();
        }}
        onDismissHeadsUp={actions.dismissHeadsUp}
        onHold={opener("hold")}
        onDeliver={opener("deliver")}
      />
      <HoldDialog
        number={number}
        board={board}
        open={open === "hold"}
        busy={actions.busy === "hold"}
        error={open === "hold" ? actions.error : null}
        returnFocus={returnFocus}
        onCancel={() => setOpen(null)}
        onConfirm={async (reason) => done(await actions.hold(target, reason))}
      />
      <DeliverDialog
        number={number}
        board={board}
        open={open === "deliver"}
        busy={actions.busy === "deliver"}
        error={open === "deliver" ? actions.error : null}
        returnFocus={returnFocus}
        onCancel={() => setOpen(null)}
        onConfirm={async () => done(await actions.deliver(target))}
      />
    </>
  );
}
