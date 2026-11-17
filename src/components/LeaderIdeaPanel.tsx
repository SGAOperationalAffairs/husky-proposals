import type { ReactNode } from "react";
import { PosterLine, type PosterData } from "./PosterLine";
import { ReviewerTag } from "./Tag";

// The extra panel a leader sees on an idea's public page (#59): who posted, the
// reviewer badge, the status actions (#98), and Take down. Students and visitors never
// get it. Presentational: `status` and `takeDown` are slots for the controls and their
// dialogs, rendered only when the viewer may use them.
// Focus lands here after a status change, when the button that was used is gone (#98).
export const LEADER_PANEL_HEADING_ID = "leader-panel-heading";

type Props = {
  poster: PosterData;
  reviewerLabel: string | null;
  mayManageStatus: boolean;
  mayTakeDown: boolean;
  status?: ReactNode;
  takeDown?: ReactNode;
};

export function LeaderIdeaPanel({
  poster,
  reviewerLabel,
  mayManageStatus,
  mayTakeDown,
  status,
  takeDown,
}: Props) {
  return (
    <section className="flex flex-col gap-3 bg-surface p-card surface-float">
      <h2 id={LEADER_PANEL_HEADING_ID} tabIndex={-1} className="heading text-3xl">
        For SGA leaders
      </h2>
      {reviewerLabel && <ReviewerTag label={reviewerLabel} />}
      <div className="flex flex-col gap-1 text-sm">
        <PosterLine poster={poster} />
      </div>
      {mayManageStatus && status}
      {mayTakeDown && takeDown}
    </section>
  );
}
