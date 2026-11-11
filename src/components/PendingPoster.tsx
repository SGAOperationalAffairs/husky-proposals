import { BOARDS, type BoardCode } from "@/core/boards";

// A post that is not public yet (#194): an outlined poster in its board's color,
// with the status in words. No support count and no link, because there is no
// public page for it. Declined posts show the reviewer's written reason.
export function PendingPoster({
  number,
  title,
  board,
  review,
  declineReason,
}: {
  number: number;
  title: string;
  board: BoardCode;
  review: "pending" | "declined";
  declineReason?: string;
}) {
  const b = BOARDS[board];
  return (
    <article data-board={b.color} className="poster-outline card-stack flex flex-col">
      <div className="flex items-center justify-between gap-3 text-xs font-bold whitespace-nowrap">
        <span className="truncate">
          {b.category} #{number}
        </span>
        <span className="truncate">{review === "pending" ? "Waiting for review" : "Not approved"}</span>
      </div>
      <h3 className="poster-title poster-title-lines heading text-balance">{title}</h3>
      {review === "declined" && declineReason && <p className="poster-desc text-sm">{declineReason}</p>}
    </article>
  );
}
