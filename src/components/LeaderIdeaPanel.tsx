import type { ReactNode } from "react";
import { PosterLine, type PosterData } from "./PosterLine";
import { ReviewerTag } from "./Tag";

// The extra panel a leader sees on an idea's public page (#59): who posted, the
// reviewer badge, and Take down. Students and visitors never get it. Presentational:
// `takeDown` is the slot for the button and its dialog, passed in only when allowed.
type Props = {
  poster: PosterData;
  reviewerLabel: string | null;
  mayTakeDown: boolean;
  takeDown?: ReactNode;
};

export function LeaderIdeaPanel({ poster, reviewerLabel, mayTakeDown, takeDown }: Props) {
  return (
    <section className="flex flex-col gap-3 bg-surface p-card surface-float">
      <h2 className="heading text-3xl">For SGA leaders</h2>
      {reviewerLabel && <ReviewerTag label={reviewerLabel} />}
      <div className="flex flex-col gap-1 text-sm">
        <PosterLine poster={poster} />
      </div>
      {mayTakeDown && takeDown}
    </section>
  );
}
