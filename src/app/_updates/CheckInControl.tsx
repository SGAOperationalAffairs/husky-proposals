"use client";

import { CheckInButton } from "@/components/CheckInButton";
import type { BoardCode } from "@/core/boards";
import { usePostUpdate } from "./usePostUpdate";

// "Still working, no news" on the idea page (#131). The hook owns the action, the toast,
// the refresh, and the error copy (#130); this only connects it to the button.
export function CheckInControl({
  ideaId,
  number,
  board,
  cadenceDays,
}: {
  ideaId: string;
  number: number;
  board: BoardCode;
  cadenceDays: number;
}) {
  const poster = usePostUpdate();
  const busy = poster.busy !== null;
  return (
    <CheckInButton
      busy={busy}
      error={poster.error?.text ?? null}
      onCheckIn={() => {
        if (busy) return;
        void poster.checkIn({ id: ideaId, number, boardId: board, cadenceDays });
      }}
    />
  );
}
