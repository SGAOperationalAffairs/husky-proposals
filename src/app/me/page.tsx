import Link from "next/link";
import { Suspense } from "react";
import { requireSignedIn } from "@/auth/gate";
import { IdeaCard } from "@/components/IdeaCard";
import { NavTabs } from "@/components/NavTabs";
import { PendingIdeaCard } from "@/components/PendingIdeaCard";
import { SiteHeader } from "@/components/SiteHeader";
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

// The ideas as posters in a grid (#193): one column on a phone, two or three wider.
// Each cell is a grid so its card stretches to the row's height, and every card in a
// row is the same height. Approved ideas are the real idea card. Pending and declined
// posts are the muted card with no count and no public link (#194).
function IdeaGrid({ rows }: { rows: MyRow[] }) {
  return (
    <ul className="grid auto-rows-fr grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
      {rows.map((row) => (
        <li key={row.number} className="grid min-w-0">
          {row.review === "approved" && row.status ? (
            <IdeaCard
              number={row.number}
              title={row.title}
              description={row.description}
              board={row.board}
              status={row.status}
              updatedDaysAgo={row.updatedDaysAgo}
              supportCount={row.supportCount}
              willingCount={row.willingCount}
            />
          ) : (
            <PendingIdeaCard
              number={row.number}
              title={row.title}
              description={row.description}
              board={row.board}
              review={row.review === "declined" ? "declined" : "pending"}
              declineReason={row.declineReason}
            />
          )}
        </li>
      ))}
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
  const rows = groups[tab];
  return (
    <>
      <h1 className="heading text-6xl @3xl:text-8xl">My ideas</h1>
      {/* The tabs are chips, the same look as the board filter (#193). Each is a link. */}
      <nav aria-label="My ideas" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/me?tab=${t.id}`}
            aria-current={t.id === tab ? "true" : undefined}
            className="poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <p className="text-muted">{empty}</p> : <IdeaGrid rows={rows} />}
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
