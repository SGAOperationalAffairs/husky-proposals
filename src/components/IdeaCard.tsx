import { MapPin } from "lucide-react";
import { SupportPair } from "./SupportPair";
import { StatusLabel, type IdeaStatus } from "./StatusLabel";
import { BoardTag, FromSgaTag } from "./Tag";

// An idea in the list (prototype .s-card). The rule across the top is the
// accent-rule token; everything else is tokens too, so templates restyle it.
export type IdeaCardData = {
  number: number;
  title: string;
  description: string;
  location?: string;
  boardTag: string;
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

const updated = (days: number) =>
  days === 0 ? "Updated today" : days === 1 ? "Updated yesterday" : `Updated ${days} days ago`;

export function IdeaCard(props: Props) {
  const { number, title, description, location, boardTag, status, fromSga, updatedDaysAgo } = props;
  return (
    <article className="flex flex-col rounded-card bordered accent-rule bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-card pt-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Proposal {number}</span>
          <BoardTag label={boardTag} />
          {fromSga && <FromSgaTag />}
        </div>
        <StatusLabel status={status} />
      </div>
      <div className="flex flex-col gap-2 px-card pt-3 pb-card">
        <h3 className="heading text-lg leading-tight">{title}</h3>
        <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-3.5" />
            {location ?? "Anywhere on campus"}
          </span>
          <span>{updated(updatedDaysAgo)}</span>
        </p>
        <p className="line-clamp-2 text-muted">{description}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-2.5">
          <SupportPair
            ideaNumber={number}
            supportCount={props.supportCount}
            willingCount={props.willingCount}
            supported={props.supported ?? false}
            participating={props.participating ?? false}
            onSupportChange={props.onSupportChange}
            onParticipateChange={props.onParticipateChange}
          />
          <a
            href={`#proposal-${number}`}
            className="rounded-button bordered border-accent-text px-3.5 py-1.5 font-semibold whitespace-nowrap text-accent-text"
          >
            Learn more
          </a>
        </div>
      </div>
    </article>
  );
}
