import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/auth/session";
import { SiteHeader } from "@/components/SiteHeader";
import { WallPlaceholder } from "@/components/Placeholder";
import { BOARDS, BOARD_CODES, type BoardCode } from "@/core/boards";
import { isSgaLeader } from "@/core/positions";
import { queueFor } from "@/core/queue";
import { QueueView } from "./QueueView";
import { QUEUE_SAMPLE } from "./sample";

// The SGA queue (#124). Leaders open straight onto the list; no dashboard. A
// student or a signed-out visitor gets the not-found page, not a sign-in prompt,
// so the page does not show that it exists. The page depends on who is signed
// in, so the check runs per request inside a boundary, as the ideas wall does.
export default function Queue() {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <SiteHeader />
      <h1 className="heading text-6xl @3xl:text-8xl">SGA queue</h1>
      <Suspense fallback={<WallPlaceholder />}>
        <QueueContent />
      </Suspense>
    </main>
  );
}

async function QueueContent() {
  await connection();
  const session = await getSession();
  if (!session || !isSgaLeader(session.roles)) notFound();
  const viewer = { user: { id: session.user.id }, roles: session.roles };
  const items = queueFor(viewer, QUEUE_SAMPLE);
  // Board filter options: only the boards this leader has anything on, in board order.
  const boards = BOARD_CODES.filter((code: BoardCode) => items.some((i) => i.boardId === code)).map(
    (code) => ({
      value: code,
      label: BOARDS[code].category,
    }),
  );
  return <QueueView items={items} boards={boards} />;
}
