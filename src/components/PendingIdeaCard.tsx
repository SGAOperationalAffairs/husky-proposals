import Link from "next/link";
import { BOARDS, type BoardCode } from "@/core/boards";
import { SupportPair } from "./SupportPair";

// A post that is not public yet, drawn as the idea card's layout (#193, #194): the same
// poster rows, on the muted tint of its board's color. Where the support count sits, the
// word PENDING or DECLINED sits instead. There is no count and no link to a public page,
// because the post has none. Pending and declined posts can still be supported or
// joined by their author, so the buttons stay normal, not greyed.
export type PendingIdeaCardData = {
  number: number;
  title: string;
  description: string;
  board: BoardCode;
  review: "pending" | "declined";
  // The reviewer's written reason, shown on a declined post (#58).
  declineReason?: string;
  // The student's own support and participation, so the buttons show their real state (#193).
  supported?: boolean;
  participating?: boolean;
};

// The student's own post is not public, so Edit and Withdraw go to My ideas until the
// real actions exist. Edit and resubmit is #128 (#193).
const PLACEHOLDER_HREF = "/me";

const actionLink = "inline-flex border-2 px-3 py-1.5 text-sm font-bold";
const actionStyle = { color: "var(--grey-ink)", borderColor: "var(--grey-ink)" };

export function PendingIdeaCard({
  number,
  title,
  description,
  board,
  review,
  declineReason,
  supported = false,
  participating = false,
}: PendingIdeaCardData) {
  const b = BOARDS[board];
  const declined = review === "declined";
  return (
    // No top padding, and the top row has the same padding as IdeaCard's, so a row's cards are
    // the same height whatever their state (#204).
    <div className="flex flex-1 flex-col">
      <article
        data-board={b.color}
        className="card-stack flex flex-1 flex-col"
        style={{
          background: "color-mix(in srgb, var(--b) 22%, var(--grey))",
          color: "var(--grey-ink)",
          padding: "var(--card-pad-y) var(--card-pad)",
        }}
      >
        {/* The status is the corner tag, as on approved cards: white, flush with the top and right
            edges, with the board's darker text color as its text, as on approved cards (#204). */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 text-xs font-bold">
          <span className="py-1">{b.category}</span>
          <span
            className="-mt-(--card-pad-y) -mr-(--card-pad) shrink-0 bg-paper-ink px-3 py-1 heading text-lg whitespace-nowrap"
            style={{ color: "color-mix(in srgb, var(--b) 22%, var(--grey))" }}
          >
            {declined ? "Not approved" : "Waiting for review"}
          </span>
        </div>
        <h3 className="poster-title poster-title-lines heading text-balance">{title}</h3>
        <p className="poster-desc text-sm">{description}</p>
        {declined && declineReason && <p className="poster-desc text-sm">{declineReason}</p>}
        <div className="card-stack mt-auto flex flex-col pt-1">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="heading text-4xl">{declined ? "DECLINED" : "PENDING"}</p>
            {declined && (
              // Edit and Withdraw are placeholders until #128 lands; they link to My ideas.
              <div className="flex flex-wrap gap-2">
                <Link href={PLACEHOLDER_HREF} className={actionLink} style={actionStyle}>
                  Edit
                </Link>
                <Link href={PLACEHOLDER_HREF} className={actionLink} style={actionStyle}>
                  Withdraw
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="relative z-10">
              <SupportPair
                ideaNumber={number}
                board={board}
                supported={supported}
                participating={participating}
              />
            </div>
            {/* Not a link: a pending or declined post has no public page to open (#194). Not underlined either, so it does not look like one. */}
            <span className="relative z-10 text-sm font-bold whitespace-nowrap">Learn more</span>
          </div>
        </div>
      </article>
    </div>
  );
}
