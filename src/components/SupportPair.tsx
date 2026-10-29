"use client";

import { ArrowUp, Hand } from "lucide-react";

// Support and "I'll participate" are a matched pair, always shown together
// (PRD decision log). Taps set a state, they never toggle on the server: the
// handlers receive the state the student wants.
type Props = {
  ideaNumber: number;
  supportCount: number;
  willingCount: number;
  supported: boolean;
  participating: boolean;
  onSupportChange?: (supported: boolean) => void;
  onParticipateChange?: (participating: boolean) => void;
  // Compact on cards (icons and counts), full on the idea page (with words).
  size?: "compact" | "full";
};

export function SupportPair({
  ideaNumber,
  supportCount,
  willingCount,
  supported,
  participating,
  onSupportChange,
  onParticipateChange,
  size = "compact",
}: Props) {
  const full = size === "full";
  const base =
    "bordered inline-flex min-w-0 flex-1 items-center justify-center gap-2 font-semibold aria-pressed:bg-accent aria-pressed:text-on-accent aria-pressed:border-accent";
  const sizing = full ? "rounded-button w-full px-5 py-2.5 text-base" : "px-3 py-1.5";
  return (
    <div className={full ? "flex w-full flex-col gap-2" : "inline-flex w-48 max-w-full"}>
      <button
        type="button"
        aria-pressed={supported}
        aria-label={full ? undefined : `Support proposal ${ideaNumber}`}
        onClick={() => onSupportChange?.(!supported)}
        className={`${base} ${sizing} bg-surface text-ink ${full ? "" : "rounded-s-button"}`}
      >
        <ArrowUp aria-hidden className="size-4" />
        {full && <span>{supported ? "Supported" : "Support"}</span>}
        <span>{supportCount}</span>
      </button>
      <button
        type="button"
        aria-pressed={participating}
        aria-label={full ? undefined : `I'll participate in proposal ${ideaNumber}`}
        title={full ? undefined : "I'll participate"}
        onClick={() => onParticipateChange?.(!participating)}
        className={`${base} ${sizing} bg-surface text-ink ${full ? "" : "rounded-e-button border-l-0"}`}
      >
        <Hand aria-hidden className="size-4" />
        {full && <span>{participating ? "Participating" : "I'll participate"}</span>}
        <span>{willingCount}</span>
      </button>
    </div>
  );
}
