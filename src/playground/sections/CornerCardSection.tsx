import type { CSSProperties } from "react";
import { SupportPair } from "@/components/SupportPair";
import { FromSgaTag } from "@/components/Tag";
import { BOARDS } from "@/core/boards";
import { IDEA_STATUSES, STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import { IDEAS } from "../sample";

// Playground only (#55 brainstorm): the "Picked up by a board" tag moved inside the
// poster, in its top-right corner. The poster is drawn here rather than with IdeaCard,
// so the status line can be left out for now. The tag's color and offset come from the
// sidebar. Colors come from tokens only.

export const CORNER_TAG_STYLES = [
  { id: "ink", label: "Solid ink" },
  { id: "ink-outline", label: "Outline ink" },
  { id: "white", label: "Solid white" },
  { id: "board-outline", label: "Outline in the board's text color" },
  { id: "board-outline-open", label: "Board-color outline, open at the top and right" },
  { id: "white-board", label: "White, with the board's text color" },
  { id: "board-fill", label: "Board's dark color, with white text" },
] as const;
export type CornerTagStyle = (typeof CORNER_TAG_STYLES)[number]["id"];

const TAG_LOOK: Record<CornerTagStyle, { className: string; style?: CSSProperties }> = {
  ink: { className: "bg-line text-surface" },
  "ink-outline": { className: "border-2 border-line text-line" },
  white: { className: "bg-surface text-line" },
  "board-outline": {
    className: "border-2",
    style: { borderColor: "var(--on-b)", color: "var(--on-b)" },
  },
  "board-outline-open": {
    className: "border-b-2 border-l-2",
    style: { borderColor: "var(--on-b)", color: "var(--on-b)" },
  },
  // White fill, with the board's dark text color (set per board below).
  "white-board": { className: "bg-paper" },
  // The board's dark color as the fill, with white text, which is the paper token in both modes.
  "board-fill": { className: "" },
};

export type CornerOffset = { x: number; y: number };

// One poster, drawn like IdeaCard but without the status line. The tag is the only mark.
function CornerPoster({
  idea,
  label,
  tagStyle,
  offset,
}: {
  idea: (typeof IDEAS)[number];
  label: string;
  tagStyle: CornerTagStyle;
  offset: CornerOffset;
}) {
  const board = BOARDS[idea.board];
  const look = TAG_LOOK[tagStyle];
  return (
    <div data-board={board.color} className="flex flex-1 flex-col">
      <article
        className="poster card-stack relative flex flex-1 flex-col"
        style={{ padding: "var(--card-pad-y) var(--card-pad)" }}
      >
        <span
          className={`absolute top-0 right-0 px-3 py-1 heading text-lg ${look.className}`}
          style={{
            ...look.style,
            ...(tagStyle === "white-board" ? { color: `var(--board-${board.color}-on-paper)` } : {}),
            ...(tagStyle === "board-fill"
              ? { background: `var(--board-${board.color}-on-paper)`, color: "var(--paper)" }
              : {}),
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        >
          {label}
        </span>
        <div className="flex items-center justify-between gap-3 pr-44 text-xs font-bold whitespace-nowrap">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{board.category}</span>
            <span className="shrink-0">#{idea.number}</span>
          </span>
          {idea.fromSga && <FromSgaTag look="poster" />}
        </div>
        <h3 className="poster-title poster-title-lines heading text-balance">{idea.title}</h3>
        <p className="poster-desc text-sm">{idea.description}</p>
        <div className="card-stack mt-auto flex flex-col pt-1">
          <p className="flex flex-wrap items-end gap-x-2.5">
            <span className="poster-number heading tabular-nums">{idea.supportCount}</span>
            <span className="pb-1 text-sm leading-tight font-semibold">
              students want this
              <br />
              {idea.willingCount} will help
            </span>
          </p>
          <div className="relative z-10">
            <SupportPair
              ideaNumber={idea.number}
              board={idea.board}
              supported={false}
              participating={false}
            />
          </div>
        </div>
      </article>
    </div>
  );
}

export function CornerCardSection({
  tagStyle = "white-board",
  offset = { x: 0, y: 0 },
}: {
  tagStyle?: CornerTagStyle;
  offset?: CornerOffset;
}) {
  // One idea per status, so the tag shows every label the status line used to.
  const everyStatus = IDEA_STATUSES.map((status: IdeaStatus) =>
    IDEAS.find((i) => i.status === status),
  ).filter((i): i is (typeof IDEAS)[number] => i !== undefined);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        The status sits in the poster&apos;s top-right corner as a tag, in place of the status line. Every
        idea shows its status this way, so there is one rule and no special case.
      </p>
      <div className="grid gap-5 @3xl:grid-cols-3">
        {everyStatus.map((idea) => (
          <CornerPoster
            key={idea.number}
            idea={idea}
            label={STATUS_LABELS[idea.status as IdeaStatus]}
            tagStyle={tagStyle}
            offset={offset}
          />
        ))}
      </div>
    </div>
  );
}
