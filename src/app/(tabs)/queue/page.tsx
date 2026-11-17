import { connection } from "next/server";
import { Suspense } from "react";
import { requireLeader } from "@/auth/gate";
import { BOARDS, BOARD_CODES, type BoardCode } from "@/core/boards";
import { queueFor } from "@/core/queue";
import { ReviewerTag } from "@/components/Tag";
import { boardsFor } from "@/core/permissions";
import { reviewerLabel } from "@/core/reviewText";
import { recentlyApproved, reviewQueue } from "@/db/reviewQueue";
import { db } from "@/db/runtime";
import { env } from "@/env";
import { usesSampleIdeas } from "@/app/_ideas/source";
import { toApprovedRow, toReviewRow } from "@/app/_review/present";
import { QueueView } from "./QueueView";
import { QUEUE_SAMPLE } from "./sample";

// "Recently approved" looks back 14 days (#59).
const DAY = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 14;

// The SGA queue (#124). Leaders open straight onto the list; no dashboard. A
// student or a signed-out visitor gets the not-found page, not a sign-in prompt,
// so the page does not show that it exists. The page depends on who is signed
// in, so the check runs per request inside a boundary, as the ideas wall does.
export default function Queue() {
  return (
    <>
      {/* The shell streams before notFound() can run, so only the header sits outside. Everything that names the page renders after the leader check (#158). */}
      <Suspense fallback={null}>
        <QueueContent />
      </Suspense>
    </>
  );
}

async function QueueContent() {
  await connection();
  const session = await requireLeader();
  const viewer = { user: { id: session.user.id }, roles: session.roles };
  const items = queueFor(viewer, QUEUE_SAMPLE);

  // Local runs and browser tests have no database (usesSampleIdeas): empty lists,
  // and db() is never touched.
  const now = new Date();
  const [queue, approved] = usesSampleIdeas(env())
    ? [[], []]
    : await Promise.all([
        reviewQueue(db(), viewer),
        recentlyApproved(db(), viewer, new Date(now.getTime() - RECENT_DAYS * DAY)),
      ]);
  const review = {
    pending: queue.map((item) => toReviewRow(item, now)),
    approved: approved.map((item) => toApprovedRow(item, now)),
  };

  // Board filter options: only the boards this leader has anything on, in board order.
  const hasBoard = (code: BoardCode) =>
    items.some((i) => i.boardId === code) ||
    review.pending.some((r) => r.boardId === code) ||
    review.approved.some((r) => r.boardId === code);
  const boards = BOARD_CODES.filter(hasBoard).map((code) => ({
    value: code,
    label: BOARDS[code].category,
  }));
  const label = reviewerLabel(boardsFor(viewer, "review"));
  return (
    <>
      <h1 className="heading text-6xl @3xl:text-8xl">SGA queue</h1>
      {label && <ReviewerTag label={label} />}
      <QueueView review={review} boards={boards} />
    </>
  );
}
