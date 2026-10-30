import { Suspense } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaFilters } from "@/components/IdeaFilters";
import { STATUS_LABELS } from "@/components/StatusLabel";
import { BOARD_CODES, BOARDS, type BoardCode } from "@/core/boards";
import { listIdeas, OPEN_STATUSES, parseIdeasQuery, SORTS, type IdeasQuery } from "./_ideas/data";

// The ideas list (#61), from the playground's Ideas section (#29) and the
// prototype's student view. Anyone with the link can browse; no sign-in.
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="@container mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 @lg:px-8 @lg:py-12">
      <header className="flex items-center gap-3">
        <span aria-hidden className="bordered px-1.5 heading text-lg leading-tight">
          SGA
        </span>
        <span className="font-bold">Husky Proposals</span>
      </header>
      <div>
        <h1 className="heading text-6xl @3xl:text-8xl">Ideas for campus</h1>
        <p className="mt-3 max-w-prose text-muted">
          Every poster is an idea a student posted. Support the ones you care about, or offer to help. Support
          helps SGA decide; it is not a vote.
        </p>
      </div>
      {/* Filters come from the URL, which is request data, so they wait in a boundary. */}
      <Suspense fallback={<p className="text-muted">Loading ideas</p>}>
        <Wall searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Wall({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const query = parseIdeasQuery(await searchParams);
  const ideas = listIdeas(query);
  return (
    <section aria-label="Ideas" className="flex flex-col gap-5">
      <nav aria-label="Boards" className="flex flex-wrap gap-2">
        <BoardFilter label="All boards" selected={!query.board} href={hrefFor(query, undefined)} />
        {BOARD_CODES.map((code) => (
          <BoardFilter
            key={code}
            label={BOARDS[code].category}
            color={BOARDS[code].color}
            selected={query.board === code}
            href={hrefFor(query, code)}
          />
        ))}
      </nav>
      {/* Keyed by the query, so the fields reset when a chip or Back changes the URL. */}
      <IdeaFilters
        key={JSON.stringify(query)}
        q={query.q}
        board={query.board}
        status={query.status}
        sort={query.sort}
        statuses={OPEN_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        sorts={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
      />
      <p role="status" className="text-sm text-muted">
        {ideas.length === 1 ? "1 idea" : `${ideas.length} ideas`}
      </p>
      {ideas.length > 0 ? (
        <div className="card-grid">
          {ideas.map((idea) => (
            <IdeaCard key={idea.number} {...idea} />
          ))}
        </div>
      ) : (
        <p className="bordered bg-surface p-card">No ideas match. Try a different search or another board.</p>
      )}
    </section>
  );
}

// A board chip keeps the other filters and swaps the board.
function hrefFor(query: IdeasQuery, board: BoardCode | undefined) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (board) params.set("board", board);
  if (query.status) params.set("status", query.status);
  if (query.sort !== "support") params.set("sort", query.sort);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
