"use client";

import { useRef, useState } from "react";
import { FinishDialog } from "@/components/FinishDialog";
import { HoldDialog } from "@/components/HoldDialog";
import { LEADER_PANEL_HEADING_ID } from "@/components/LeaderIdeaPanel";
import { StatusActions } from "@/components/StatusActions";
import type { BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";
import { useStatusActions } from "./useStatusActions";

// The idea page's status controls (#98, #126): the buttons, the hold and finish dialogs,
// and the hook. A dialog returns focus to the button that opened it. When the status
// changes that button may be gone, so focus goes to the panel's heading instead.
// Start and Reopen run directly, with no dialog.
type Dialog = "hold" | "finish" | null;

export function IdeaStatusControls({
  ideaId,
  number,
  board,
  status,
  waitingReason,
  closedReason,
}: {
  ideaId: string;
  number: number;
  board: BoardCode;
  status: IdeaStatus;
  waitingReason: string | null;
  closedReason: string | null;
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
  const focusHeadingIf = (ok: boolean) => {
    if (ok) document.getElementById(LEADER_PANEL_HEADING_ID)?.focus();
  };

  return (
    <>
      <StatusActions
        status={status}
        waitingReason={waitingReason}
        closedReason={closedReason}
        board={board}
        busy={actions.busy}
        // The dialogs show their own failures while open.
        error={open ? null : actions.error}
        headsUp={actions.headsUp}
        onStart={async () => focusHeadingIf(await actions.start(target))}
        onReopen={async () => focusHeadingIf(await actions.reopen(target))}
        onConfirmHeadsUp={async () => focusHeadingIf(await actions.confirmHeadsUp(target))}
        onDismissHeadsUp={actions.dismissHeadsUp}
        onHold={opener("hold")}
        onFinish={opener("finish")}
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
      <FinishDialog
        number={number}
        board={board}
        open={open === "finish"}
        busy={actions.busy === "deliver" || actions.busy === "close" ? actions.busy : null}
        error={open === "finish" ? actions.error : null}
        returnFocus={returnFocus}
        onCancel={() => setOpen(null)}
        onDeliver={async () => done(await actions.deliver(target))}
        onClose={async (reason) => done(await actions.close(target, reason))}
      />
    </>
  );
}
