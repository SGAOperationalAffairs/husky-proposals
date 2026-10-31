"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import type { BoardCode } from "@/core/boards";

// Support and I'll participate taps held in the page until E6 saves them, so
// the pair, its confirmation (#67), and the toasts work on the wall and on an
// idea's page. Nothing is stored and the counts do not change; a reload
// clears the taps. Replaced by the support and participate actions.
type Taps = Record<number, boolean>;

export function useLocalTaps() {
  const toast = useToast();
  const [supported, setSupported] = useState<Taps>({});
  const [participating, setParticipating] = useState<Taps>({});
  const setSupport = (n: number, v: boolean) => setSupported((s) => ({ ...s, [n]: v }));
  const setParticipate = (n: number, v: boolean) => setParticipating((s) => ({ ...s, [n]: v }));

  return (n: number, board: BoardCode) => ({
    supported: !!supported[n],
    participating: !!participating[n],
    onSupportChange: (v: boolean) => {
      setSupport(n, v);
      toast(
        v
          ? {
              title: `You support #${n}.`,
              description: "Support helps SGA decide.",
              action: { label: "Undo", onClick: () => setSupport(n, false) },
              board,
            }
          : { title: `You no longer support #${n}.`, board },
      );
    },
    onParticipateChange: (v: boolean) => {
      setParticipate(n, v);
      toast(
        v
          ? {
              title: `You offered to help with #${n}.`,
              description: "SGA may email you if it moves forward.",
              action: { label: "Undo", onClick: () => setParticipate(n, false) },
              board,
            }
          : { title: `You withdrew your offer to help with #${n}.`, board },
      );
    },
  });
}
