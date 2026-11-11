import Link from "next/link";
import { Suspense } from "react";
import { requireSignedIn } from "@/auth/gate";
import { BoardChip } from "@/components/BoardChip";
import { PendingPoster } from "@/components/PendingPoster";
import { NavTabs } from "@/components/NavTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { STATUS_LABELS } from "@/core/statuses";
import { groupMyIdeas, type MyRow } from "./groups";
import { sampleMyRows } from "./sample";

// My ideas (#193): the signed-in student's own ideas, in three tabs. The tab is
// in the URL, so each tab is a link and works without script. The rows come from
// sample data until the student's queries (#97) land.
type Tab = "written" | "supported" | "participated";

const TABS: { id: Tab; label: string; empty: string }[] = [
  {
    id: "written",
    label: "Written",
    empty: "You have not posted an idea yet. Post one, and it will show here while it is reviewed.",
  },
  {
    id: "supported",
    label: "Supported",
    empty: "You have not supported an idea yet. Tap support on an idea you care about.",
  },
  {
    id: "participated",
    label: "Participated",
    empty: "You have not said you will help with an idea yet. Tap “I’ll participate” on one to see it here.",
  },
];

const tabFrom = (value: string | string[] | undefined): Tab =>
  TABS.find((t) => t.id === value)?.id ?? "written";

function Rows({ rows, empty }: { rows: MyRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {rows.map((row) =>
        row.review === "approved" && row.status ? (
          <li key={row.number} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <BoardChip board={row.board} />
              <span className="text-sm">#{row.number}</span>
            </div>
            <Link href={`/ideas/${row.number}`} className="heading text-3xl underline underline-offset-4">
              {row.title}
            </Link>
            <p className="text-sm text-muted">{STATUS_LABELS[row.status]}</p>
          </li>
        ) : (
          <li key={row.number} className="py-4">
            <PendingPoster
              number={row.number}
              title={row.title}
              board={row.board}
              review={row.review === "declined" ? "declined" : "pending"}
              declineReason={row.declineReason}
            />
          </li>
        ),
      )}
    </ul>
  );
}

// The query and the session are per request, so they are read inside the boundary,
// as the sign-in page does, so the page can still be prerendered (#193).
async function MyIdeas({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = tabFrom(tabParam);
  await requireSignedIn("/me");
  const groups = groupMyIdeas(sampleMyRows());
  const empty = TABS.find((t) => t.id === tab)?.empty ?? "";
  return (
    <>
      <h1 className="heading text-6xl @3xl:text-8xl">My ideas</h1>
      <nav aria-label="My ideas" className="flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/me?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={t.id === tab ? "border-b-4 border-accent-text pb-2 font-bold" : "pb-2 text-muted"}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Rows rows={groups[tab]} empty={empty} />
    </>
  );
}

export default function Me({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 @lg:px-8 @lg:pt-8 @lg:pb-12">
      <SiteHeader nav={<NavTabs current="me" />} />
      <Suspense fallback={null}>
        <MyIdeas searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
