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
    ? "poster card-stack @container flex flex-col"
    : "poster card-stack @container flex flex-col poster-arrive";

export function IdeaCard(props: Props) {
  const board = BOARDS[props.board];
  const delivered = props.status === "delivered";
  return (
    <article
      data-board={board.color}
      data-idea={props.number}
      className={posterClass(props.arrival)}
      style={props.arrival === undefined ? undefined : ({ "--arrival": props.arrival } as CSSProperties)}
    >
      {/* One line, always: long labels end in an ellipsis instead of wrapping. */}
      <div className="flex items-center justify-between gap-3 text-xs font-bold whitespace-nowrap">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{board.category}</span>
          <span className="shrink-0">#{props.number}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          {props.fromSga && <FromSgaTag look="poster" />}
          <span className="truncate">{STATUS_LABELS[props.status]}</span>
        </span>
      </div>
      <h3 className="poster-title poster-title-lines heading text-balance">{props.title}</h3>
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
            <SupportPair
              ideaNumber={props.number}
              board={props.board}
              supported={props.supported ?? false}
              participating={props.participating ?? false}
              onSupportChange={props.onSupportChange}
              onParticipateChange={props.onParticipateChange}
            />
          )}
          <Link
            transitionTypes={PAGE}
            href={`/ideas/${props.number}`}
            className="text-sm font-bold whitespace-nowrap underline underline-offset-4"
          >
            Learn more<span className="sr-only"> about proposal {props.number}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
