"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { TakeDownDialog } from "@/components/TakeDownDialog";
import type { BoardCode } from "@/core/boards";
import { useReviewActions } from "./useReviewActions";

// The idea page's Take down (#59): the button, its dialog, and the hook. Once the idea
// is down the page is no longer public, so the browser goes to the queue.
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
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="line"
        onClick={(e) => {
          opener.current = e.currentTarget;
          actions.clearError();
          setOpen(true);
        }}
      >
        Take down
      </Button>
      <TakeDownDialog
        number={number}
        board={board}
        open={open}
        busy={actions.busy === "take_down"}
        error={actions.error}
        returnFocus={opener}
        onCancel={() => setOpen(false)}
        onConfirm={async (reason) => {
          if (await actions.takeDown({ id: ideaId, boardId: board, number }, reason)) {
            setOpen(false);
            router.push("/queue");
          }
        }}
      />
    </>
  );
}
