"use client";

import { SupportPair } from "@/components/SupportPair";
import type { BoardCode } from "@/core/boards";
import { useLocalTaps } from "./useLocalTaps";

// The labeled pair on an idea's page, with taps held in the page (useLocalTaps).
export function LocalSupportPair({ ideaNumber, board }: { ideaNumber: number; board: BoardCode }) {
  const taps = useLocalTaps();
  return <SupportPair look="buttons" ideaNumber={ideaNumber} board={board} {...taps(ideaNumber, board)} />;
}
