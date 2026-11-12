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
    // The top padding leaves room for the stamp that approved cards may show, so a row's
    // cards line up whatever their state (as IdeaCard does, #112).
    <div className="flex flex-1 flex-col pt-7">
      <article
        data-board={b.color}
        className="card-stack flex flex-1 flex-col"
        style={{
          background: "color-mix(in srgb, var(--b) 22%, var(--grey))",
          color: "var(--grey-ink)",
          padding: "var(--card-pad-y) var(--card-pad)",
        }}
      >
        <div className="flex items-center justify-between gap-3 text-xs font-bold whitespace-nowrap">
          <span className="truncate">{b.category}</span>
          <span className="truncate">{declined ? "Not approved" : "Waiting for review"}</span>
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
