import type { ReactNode } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";

// A post that is not public yet (#194): an outlined poster in its board's color,
// with the status in words. No support count and no link, because there is no
// public page for it. Declined posts show the reviewer's written reason.
export type PosterFill = "blank" | "zero" | "word";

export function PendingPoster({
  title,
  board,
  review,
  declineReason,
  muted = false,
  hatched = false,
  description,
  fill = "blank",
  footer,
}: {
  number: number;
  title: string;
  board: BoardCode;
  review: "pending" | "declined";
  declineReason?: string;
  // Muted: a grey tint of the board color, for the grid (#193). Default is the outline.
  muted?: boolean;
  // Hatched: the muted tint with diagonal stripes in the board color (#193).
  hatched?: boolean;
  // The post's description, shown under its title, as on the idea card.
  description?: string;
  // What fills the empty space under the title (#193): nothing, a big 0, or the word.
  fill?: PosterFill;
  // An action inside the card, at its foot, as the idea cards have theirs (#193).
  footer?: ReactNode;
}) {
  const b = BOARDS[board];
  return (
    <article
      data-board={b.color}
      className={`${muted ? "" : "poster-outline"} card-stack flex flex-1 flex-col`}
      style={
        muted
          ? {
              background: hatched
                ? "repeating-linear-gradient(45deg, color-mix(in srgb, var(--b) 45%, transparent) 0 6px, transparent 6px 14px), color-mix(in srgb, var(--b) 22%, var(--grey))"
                : "color-mix(in srgb, var(--b) 22%, var(--grey))",
              color: "var(--grey-ink)",
              padding: "var(--card-pad-y) var(--card-pad)",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3 text-xs font-bold whitespace-nowrap">
        <span className="truncate">{b.category}</span>
        <span className="truncate">{review === "pending" ? "Waiting for review" : "Not approved"}</span>
      </div>
      <h3 className="poster-title poster-title-lines heading text-balance">{title}</h3>
      {description && <p className="poster-desc text-sm">{description}</p>}
      {review === "declined" && declineReason && <p className="poster-desc text-sm">{declineReason}</p>}
      {(footer || fill === "blank") && (
        <div className="mt-auto flex flex-col gap-3 pt-4">
          {fill === "blank" && (
            <span className="text-xs font-bold">{review === "pending" ? "PENDING" : "DECLINED"}</span>
          )}
          {footer}
        </div>
      )}
      {fill === "zero" && <span className="poster-number mt-auto pt-4 heading tabular-nums">0</span>}
      {fill === "word" && (
        <span className="mt-auto pt-4 heading text-6xl">{review === "pending" ? "PENDING" : "DECLINED"}</span>
      )}
    </article>
  );
}
