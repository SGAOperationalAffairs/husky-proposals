import Link from "next/link";
import type { CSSProperties } from "react";
import { BOARDS } from "@/core/boards";
import type { QueueItem } from "@/core/queue";
import { BoardChip } from "@/components/BoardChip";
import { StatusLabel } from "@/components/StatusLabel";
import { STATUS_LABELS, type IdeaStatus } from "@/core/statuses";

// One row of the SGA queue (#124), in one of several looks, on a shared column
// grid so every row lines up with the header. Color is never the only cue: the
// board and status are always written out.
export const ROW_STYLES = [
  { id: "plain", label: "Plain" },
  { id: "square", label: "Colored square" },
  { id: "rail", label: "Color rail" },
  { id: "rail-neutral", label: "Rail, plain bottom" },
  { id: "band", label: "Color band" },
  { id: "tag", label: "Board tag" },
  { id: "underline", label: "Color underline" },
] as const;
export type RowStyle = (typeof ROW_STYLES)[number]["id"];

// Which columns take the board's color: the number, the status, or both.
export const HIGHLIGHTS = [
  { id: "none", label: "None" },
  { id: "number", label: "Number" },
  { id: "status", label: "Status" },
  { id: "both", label: "Number and status" },
] as const;
export type Highlight = (typeof HIGHLIGHTS)[number]["id"];

// The same column spans for the header and every row (12 columns).
export const COLUMNS = {
  title: "col-span-5",
  board: "col-span-2",
  number: "col-span-1",
  status: "col-span-2",
  support: "col-span-2 text-right",
} as const;

// Every row takes a light tone on hover (and on keyboard focus within), so the row reads as one target (#124).
const BASE = "group grid grid-cols-12 items-baseline gap-3 px-4 py-3 transition-colors hover:bg-bg";

const rowClass: Record<RowStyle, string> = {
  plain: BASE,
  square: BASE,
  rail: `${BASE} border-l-8`,
  "rail-neutral": `${BASE} border-l-8`,
  band: BASE,
  tag: BASE,
  underline: BASE,
};

const rowStyle = (style: RowStyle): CSSProperties | undefined => {
  switch (style) {
    case "rail":
      // Every border takes the board color, so the divider under the row is colored too.
      return { borderColor: "var(--b)" };
    case "rail-neutral":
      // Only the left rule takes the board color; the dividers stay plain.
      return { borderLeftColor: "var(--b)" };
    case "band":
      return { background: "var(--b)", color: "var(--on-b)" };
    case "underline":
      return { borderBottom: "6px solid var(--b)" };
    default:
      return undefined;
  }
};

export function QueueRow({
  item,
  style,
  highlight = "none",
  titleUnderline = true,
}: {
  item: QueueItem;
  style: RowStyle;
  highlight?: Highlight;
  titleUnderline?: boolean;
}) {
  const board = BOARDS[item.boardId];
  const band = style === "band";
  // The post branches below are deliberate defensive handling: pending posts never reach the Ideas tab (#139).
  const status = item.kind === "post" ? "Pending review" : STATUS_LABELS[item.status as IdeaStatus];
  const href = item.kind === "post" ? `/queue/review/${item.number}` : `/ideas/${item.number}`;
  const showNumber = highlight === "number" || highlight === "both";
  const showStatus = highlight === "status" || highlight === "both";
  const muted = band ? "" : "text-muted";
  return (
    <li data-board={board.color} className={rowClass[style]} style={rowStyle(style)}>
      <div className={`${COLUMNS.title} min-w-0`}>
        <Link
          href={href}
          className={
            titleUnderline
              ? "font-bold underline underline-offset-4"
              : "font-bold underline-offset-4 group-focus-within:underline group-hover:underline"
          }
        >
          {style === "square" && (
            <span
              aria-hidden
              className="mr-2 inline-block size-3 align-middle"
              style={{ background: band ? "var(--on-b)" : "var(--b)" }}
            />
          )}
          {item.title}
        </Link>
      </div>
      <div className={`${COLUMNS.board} text-sm ${muted}`}>
        {style === "tag" ? <BoardChip board={item.boardId} inverse={band} /> : board.category}
      </div>
      <div
        className={`${COLUMNS.number} text-sm tabular-nums ${muted}`}
        style={showNumber && !band ? { color: "var(--b-text)", fontWeight: 700 } : undefined}
      >
        #{item.number}
      </div>
      <div className={`${COLUMNS.status} text-sm ${muted}`}>
        {showStatus ? <StatusLabel status={item.kind === "post" ? "pending" : item.status} /> : status}
      </div>
      <div className={`${COLUMNS.support} text-sm tabular-nums ${muted}`}>
        {item.kind === "post" ? "Not approved yet" : item.supportCount}
      </div>
    </li>
  );
}

// The column labels above the rows, on the same grid (#124).
export function QueueHeader() {
  return (
    <div className="grid grid-cols-12 gap-3 border-b border-line px-4 py-2 text-xs font-bold text-muted">
      <div className={COLUMNS.title}>Title</div>
      <div className={COLUMNS.board}>Board</div>
      <div className={COLUMNS.number}>No.</div>
      <div className={COLUMNS.status}>Status</div>
      <div className={COLUMNS.support}>Supported</div>
    </div>
  );
}
