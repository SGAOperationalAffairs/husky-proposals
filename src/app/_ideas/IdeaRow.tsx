import Link from "next/link";
import type { IdeaCardData } from "@/components/IdeaCard";
import { PAGE } from "@/components/pageTransition";
import { COLUMNS, STATUS_TINT } from "@/app/queue/QueueRow";
import { BOARDS } from "@/core/boards";
import { STATUS_LABELS } from "@/core/statuses";

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
        <span
          className="px-2 py-0.5 text-xs font-bold"
          style={{ background: "var(--b)", color: "var(--on-b)" }}
        >
          {board.category}
        </span>
      </div>
      <div className={`${COLUMNS.number} text-sm text-muted tabular-nums`}>#{idea.number}</div>
      <div className={COLUMNS.status}>
        <span className="px-2 py-0.5 text-xs font-bold" style={STATUS_TINT[idea.status]}>
          {STATUS_LABELS[idea.status]}
        </span>
      </div>
      <div className={`${COLUMNS.support} text-sm text-muted tabular-nums`}>{idea.supportCount}</div>
    </li>
  );
}
