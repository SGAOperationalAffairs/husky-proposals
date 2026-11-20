"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { TakeDownDialog, type PullBackKind } from "@/components/TakeDownDialog";
import type { BoardCode } from "@/core/boards";
import { useReviewActions } from "./useReviewActions";

// The idea page's Send back and Take down (#59, #286): the two buttons, one dialog, and
// the hook. Send back comes first, as the softer and more common choice. Once the idea
// is off the list the page is no longer public, so the browser goes to the queue.
export function LeaderIdeaControls({
  ideaId,
  number,
  board,
}: {
  ideaId: string;
  number: number;
  board: BoardCode;
}) {
  const router = useRouter();
  const actions = useReviewActions();
  const [kind, setKind] = useState<PullBackKind | null>(null);
  // The dialog keeps rendering while it animates out, after `kind` is cleared.
  const [lastKind, setLastKind] = useState<PullBackKind>("send_back");
  const opener = useRef<HTMLElement | null>(null);

  const openFor = (next: PullBackKind, button: HTMLElement) => {
    opener.current = button;
    actions.clearError();
    setLastKind(next);
    setKind(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="line" onClick={(e) => openFor("send_back", e.currentTarget)}>
        Send back
      </Button>
      <Button variant="plain" onClick={(e) => openFor("take_down", e.currentTarget)}>
        Take down
      </Button>
      <TakeDownDialog
        kind={lastKind}
        number={number}
        board={board}
        open={kind !== null}
        busy={actions.busy === lastKind}
        error={actions.error}
        returnFocus={opener}
        onCancel={() => setKind(null)}
        onConfirm={async (reason) => {
          const target = { id: ideaId, boardId: board, number };
          const done =
            lastKind === "send_back"
              ? await actions.sendBack(target, reason)
              : await actions.takeDown(target, reason);
          if (done) {
            setKind(null);
            router.push("/queue");
          }
        }}
      />
    </div>
  );
}
