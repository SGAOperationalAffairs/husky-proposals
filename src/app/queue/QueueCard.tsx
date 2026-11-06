import Link from "next/link";
import { BOARDS } from "@/core/boards";
import type { QueueItem } from "@/core/queue";
import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";

// A queue item as a poster (#139), in the ideas wall's look. No support or participate
// buttons: those are for students, and the queue is for the people who decide.
export function QueueCard({ item }: { item: QueueItem }) {
  const board = BOARDS[item.boardId];
  // The post branches below are deliberate defensive handling: pending posts never reach the Ideas tab (#139).
  const status = item.kind === "post" ? "Pending review" : STATUS_LABELS[item.status as IdeaStatus];
  const href = item.kind === "post" ? `/queue/review/${item.number}` : `/ideas/${item.number}`;
  return (
    // The wrapper's top padding matches IdeaCard's, so queue posters line up with the wall's (#139).
    <div className="flex flex-col pt-7">
      <article
        data-board={board.color}
        className="poster card-stack @container relative flex flex-1 flex-col"
      >
        <div className="flex items-center justify-between gap-3 text-xs font-bold whitespace-nowrap">
          <span className="truncate">
            {board.category} #{item.number}
          </span>
          <span className="truncate">{status}</span>
        </div>
        <h3 className="poster-title poster-title-lines heading text-balance">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {item.title}
          </Link>
        </h3>
        {item.description && <p className="poster-desc text-sm">{item.description}</p>}
        <p className="mt-auto pt-1 text-sm">
          {item.kind === "post" ? (
            "Not approved yet"
          ) : (
            <>
              <span className="heading tabular-nums">{item.supportCount}</span> supported
            </>
          )}
        </p>
      </article>
    </div>
  );
}
