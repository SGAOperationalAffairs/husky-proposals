import { BOARDS, type BoardCode } from "@/core/boards";
import { STATUS_LABELS, type IdeaStatus } from "./StatusLabel";
import { SupportPair } from "./SupportPair";

// An idea as a poster in its board's color (#29, the Poster direction): a big
// condensed headline, the support count as the largest number, and the matched
// Support / I'll participate pair.
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

export const updatedText = (days: number) =>
  days === 0 ? "updated today" : days === 1 ? "updated yesterday" : `updated ${days} days ago`;

export function IdeaCard(props: Props) {
  const board = BOARDS[props.board];
  return (
    <article data-board={board.color} className="poster @container flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs font-bold">
        <span className="flex flex-wrap gap-x-3">
          <span className="card-board">{board.category}</span>
          <span className="card-number">Proposal {props.number}</span>
        </span>
        <span className="flex items-center gap-2">
          {props.fromSga && <span className="card-sga border border-current px-1.5">From SGA</span>}
          <span className="card-status">{STATUS_LABELS[props.status]}</span>
        </span>
      </div>
      <div className="card-headline">
        <h3 className="poster-title poster-title-lines heading text-balance">{props.title}</h3>
      </div>
      <div className="card-desc">
        <p className="poster-desc text-sm">{props.description}</p>
      </div>
      <p className="card-place text-xs font-semibold">
        {props.location ?? "Anywhere on campus"}, {updatedText(props.updatedDaysAgo)}
      </p>
      {/* The count and buttons sit at the bottom, so they line up across a row. */}
      <div className="mt-auto flex flex-col gap-3 pt-1">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="card-count">
            <p className="flex flex-wrap items-end gap-x-2.5">
              <span className="poster-number heading tabular-nums">{props.supportCount}</span>
              <span className="pb-1 text-sm leading-tight font-semibold">
                students want this
                <span className="card-helpers">{props.willingCount} will help</span>
              </span>
            </p>
          </div>
          <a
            href={`#proposal-${props.number}`}
            className="card-learn pb-1 text-sm font-bold whitespace-nowrap underline underline-offset-4"
          >
            Learn more
          </a>
        </div>
        <div className="card-buttons">
          <SupportPair
            ideaNumber={props.number}
            supported={props.supported ?? false}
            participating={props.participating ?? false}
            onSupportChange={props.onSupportChange}
            onParticipateChange={props.onParticipateChange}
          />
        </div>
      </div>
    </article>
  );
}
