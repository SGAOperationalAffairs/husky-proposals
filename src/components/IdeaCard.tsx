import Link from "next/link";
import type { CSSProperties } from "react";
import { PAGE } from "@/components/pageTransition";
import { BOARDS, type BoardCode } from "@/core/boards";
import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import { SupportPair } from "./SupportPair";
import { FromSgaTag } from "./Tag";

// An idea as a poster in its board's color (#29, the Poster direction): the
// board and number on one line, a big condensed headline, the support count as
// the largest number, and the Support / I'll participate icons beside Learn more.
export type IdeaCardData = {
  number: number;
  title: string;
  description: string;
  location?: string;
  board: BoardCode;
  status: IdeaStatus;
  fromSga?: boolean;
  updatedDaysAgo: number;
  supportCount: number;
  willingCount: number;
};

type Props = IdeaCardData & {
  supported?: boolean;
  participating?: boolean;
  onSupportChange?: (supported: boolean) => void;
  onParticipateChange?: (participating: boolean) => void;
  // Set only on the wall's first arrival, to rise in after the posters before
  // it (#84). Omitted on filtered cards, so they do not move.
  arrival?: number;
};

// Dates read as people say them (docs/DESIGN.md, "Copy and tone").
export const daysAgoText = (days: number) =>
  days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
export const updatedText = (days: number) => `updated ${daysAgoText(days)}`;

// The arrival class is added as its own word, so the Tailwind formatter cannot
// fuse it onto the last one (#84).
const posterClass = (arrival: number | undefined) =>
  arrival === undefined
    ? "group poster card-stack @container relative flex flex-1 flex-col motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1"
    : "group poster card-stack @container relative flex flex-1 flex-col poster-arrive motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1";

export function IdeaCard(props: Props) {
  const board = BOARDS[props.board];
  const delivered = props.status === "delivered";
  // The status is a tag in the poster's top-right corner (Nov 11), in the top row, so it
  // never covers the board line and works on a narrow card too. The picked-up stamp is gone.
  return (
    <div className="flex flex-col">
      <article
        data-board={board.color}
        data-idea={props.number}
        className={posterClass(props.arrival)}
        style={props.arrival === undefined ? undefined : ({ "--arrival": props.arrival } as CSSProperties)}
      >
        {/* The top row: board and number, then the status tag flush in the corner. The tag's
            negative margins cancel the card's padding, so it touches the top and right edges. */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 text-xs font-bold">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 py-1">
            <span>{board.category}</span>
            <span>#{props.number}</span>
            {props.fromSga && <FromSgaTag look="poster" />}
          </span>
          {/* Orange and yellow: a black box with the board's poster color as text. Both use fixed
              tokens (paper-ink, and the poster colors, which dark mode does not change), so the tag
              looks the same in light and dark mode (Nov 11). */}
          <span
            className={`-mt-(--card-pad-y) -mr-(--card-pad) shrink-0 px-3 py-1 heading text-lg whitespace-nowrap ${
              board.color === "planning" || board.color === "services" ? "bg-paper-ink" : "bg-paper"
            }`}
            style={{
              color:
                board.color === "planning" || board.color === "services"
                  ? `var(--board-${board.color})`
                  : `var(--board-${board.color}-on-paper)`,
            }}
          >
            {STATUS_LABELS[props.status]}
          </span>
        </div>
        <h3 className="poster-title poster-title-lines heading text-balance">
          <Link
            transitionTypes={PAGE}
            href={`/ideas/${props.number}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {props.title}
          </Link>
        </h3>
        <p className="poster-desc text-sm">{props.description}</p>
        {/* The count and buttons sit at the bottom, so they line up across a row. */}
        <div className="card-stack mt-auto flex flex-col pt-1">
          <p className="flex flex-wrap items-end gap-x-2.5">
            <span className="poster-number heading tabular-nums">{props.supportCount}</span>
            <span className="pb-1 text-sm leading-tight font-semibold">
              {/* Delivered ideas are done; support is in the past (#63). */}
              {delivered ? "students supported this" : "students want this"}
              <br />
              {props.willingCount} will help
            </span>
          </p>
          <div className="flex items-center justify-between gap-3">
            {delivered ? (
              <span className="text-sm font-bold">Delivered</span>
            ) : (
              <div className="relative z-10">
                <SupportPair
                  ideaNumber={props.number}
                  board={props.board}
                  supported={props.supported ?? false}
                  participating={props.participating ?? false}
                  onSupportChange={props.onSupportChange}
                  onParticipateChange={props.onParticipateChange}
                />
              </div>
            )}
            <Link
              transitionTypes={PAGE}
              href={`/ideas/${props.number}`}
              className="relative z-10 text-sm font-bold whitespace-nowrap underline underline-offset-4"
            >
              Learn more<span className="sr-only"> about proposal {props.number}</span>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
