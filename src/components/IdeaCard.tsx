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
};

// Dates read as people say them (docs/DESIGN.md, "Copy and tone").
export const daysAgoText = (days: number) =>
  days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
export const updatedText = (days: number) => `updated ${daysAgoText(days)}`;

export function IdeaCard(props: Props) {
  const board = BOARDS[props.board];
  const delivered = props.status === "delivered";
  return (
    <article data-board={board.color} className="poster card-stack @container flex flex-col">
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
              supported={props.supported ?? false}
              participating={props.participating ?? false}
              onSupportChange={props.onSupportChange}
              onParticipateChange={props.onParticipateChange}
            />
          )}
          <a
            href={`/ideas/${props.number}`}
            className="text-sm font-bold whitespace-nowrap underline underline-offset-4"
          >
            Learn more<span className="sr-only"> about proposal {props.number}</span>
          </a>
        </div>
      </div>
    </article>
  );
}
