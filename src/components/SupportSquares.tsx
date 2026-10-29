import { Flag } from "lucide-react";

// One square per student who supports an idea, plus rank within the board
// (PRD decision log: no goal-based progress bars). The squares are visual
// only, so the count is also given as text (accessibility baseline).
type Props = {
  count: number;
  rank?: { position: number; of: number; board: string };
};

export function SupportSquares({ count, rank }: Props) {
  return (
    <div>
      <div role="img" aria-label={`${count} students support this`} className="grid grid-cols-25 gap-0.5">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="aspect-square bg-accent" />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        <b className="text-ink">{count} students</b> support this. Each square is one student. Support helps
        SGA decide; it is not a vote.
      </p>
      {rank && (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm font-semibold">
          <Flag aria-hidden className="size-4 text-accent-text" />
          Ranked {rank.position} of {rank.of} ideas for {rank.board}
        </p>
      )}
    </div>
  );
}
