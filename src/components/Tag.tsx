import { BOARDS, type BoardCode } from "@/core/boards";

// The board's category with a swatch of its color ("Dining"), and the "From
// SGA" tag on ideas posted by SGA leaders (data-model.md, review decisions).
export function BoardTag({ board }: { board: BoardCode }) {
  const b = BOARDS[board];
  return (
    <span data-board={b.color} className="inline-flex items-center gap-1.5 text-xs font-bold">
      <span aria-hidden className="board-swatch size-3" />
      {b.category}
    </span>
  );
}

// One tag, two looks (#35). "poster" outlines in the poster's text color
// (`border-current`) and takes the type of its line, so it reads on any board
// color. `shrink-0` keeps it whole in the card's one-line top row.
const FROM_SGA_LOOKS = {
  plain: "text-xs font-bold",
  poster: "border-current",
} satisfies Record<string, string>;

export function FromSgaTag({ look = "plain" }: { look?: keyof typeof FROM_SGA_LOOKS }) {
  return <span className={`shrink-0 bordered px-1.5 ${FROM_SGA_LOOKS[look]}`}>From SGA</span>;
}
