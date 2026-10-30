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
        <span>
          {board.category}, proposal {props.number}
        </span>
        <span className="flex items-center gap-2">
          {props.fromSga && <span className="border border-current px-1.5">From SGA</span>}
          {STATUS_LABELS[props.status]}
        </span>
      </div>
      <h3 className="poster-title heading text-balance">{props.title}</h3>
      <p className="poster-desc text-sm">{props.description}</p>
      <p className="text-xs font-semibold">
        {props.location ?? "Anywhere on campus"}, {updatedText(props.updatedDaysAgo)}
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="flex flex-wrap items-end gap-x-2.5">
          <span className="poster-number heading tabular-nums">{props.supportCount}</span>
          <span className="pb-1 text-sm leading-tight font-semibold">
            students want this
            <br />
            {props.willingCount} will help
          </span>
        </p>
        <a
          href={`#proposal-${props.number}`}
          className="pb-1 text-sm font-bold whitespace-nowrap underline underline-offset-4"
        >
          Learn more
        </a>
      </div>
      <SupportPair
        ideaNumber={props.number}
        supported={props.supported ?? false}
        participating={props.participating ?? false}
        onSupportChange={props.onSupportChange}
        onParticipateChange={props.onParticipateChange}
      />
    </article>
  );
}
