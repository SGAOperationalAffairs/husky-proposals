import { BOARDS, type BoardCode } from "@/core/boards";

// A board's name on a solid chip in the board's color (#151). `inverse` swaps the
// colors for a row whose background is already the board's color, so the chip still shows.
// data-board on the chip sets --b for it, so var(--b) resolves here.
export function BoardChip({ board, inverse = false }: { board: BoardCode; inverse?: boolean }) {
  const b = BOARDS[board];
  const colors = inverse
    ? { background: "var(--on-b)", color: "var(--b)" }
    : { background: "var(--b)", color: "var(--on-b)" };
  return (
    <span data-board={b.color} className="inline-block px-2 py-0.5 text-xs font-bold" style={colors}>
      {b.category}
    </span>
  );
}
