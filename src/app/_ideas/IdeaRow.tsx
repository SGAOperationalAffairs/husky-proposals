import Link from "next/link";
import type { IdeaCardData } from "@/components/IdeaCard";
import { PAGE } from "@/components/pageTransition";
import { COLUMNS } from "@/app/(tabs)/queue/QueueRow";
import { BoardChip } from "@/components/BoardChip";
import { StatusLabel } from "@/components/StatusLabel";
import { BOARDS } from "@/core/boards";

// An idea as a row on the ideas list (#138), on the same column grid and look as
// the SGA queue. Public fields only: no names, nothing a visitor may not see.
export function IdeaRow({ idea }: { idea: IdeaCardData }) {
  const board = BOARDS[idea.board];
  return (
    <li
      data-board={board.color}
      className="group grid grid-cols-12 items-baseline gap-3 px-4 py-3 transition-colors hover:bg-bg"
    >
      <div className={`${COLUMNS.title} min-w-0`}>
        <Link
          transitionTypes={PAGE}
          href={`/ideas/${idea.number}`}
          className="font-bold underline-offset-4 group-focus-within:underline group-hover:underline"
        >
          {idea.title}
        </Link>
      </div>
      <div className={COLUMNS.board}>
        <BoardChip board={idea.board} />
      </div>
      <div className={`${COLUMNS.number} text-sm text-muted tabular-nums`}>#{idea.number}</div>
      <div className={COLUMNS.status}>
        <StatusLabel status={idea.status} />
      </div>
      <div className={`${COLUMNS.support} text-sm text-muted tabular-nums`}>{idea.supportCount}</div>
    </li>
  );
}
