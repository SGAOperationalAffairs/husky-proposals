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

export function FromSgaTag() {
  return <span className="bordered px-1.5 text-xs font-bold">From SGA</span>;
}
