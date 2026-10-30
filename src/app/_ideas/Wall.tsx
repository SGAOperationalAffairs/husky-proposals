import { BoardFilter } from "@/components/BoardFilter";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaFilters } from "@/components/IdeaFilters";
import { STATUS_LABELS } from "@/core/statuses";
import { BOARD_CODES, BOARDS, type BoardCode } from "@/core/boards";
import { listIdeas, OPEN_STATUSES, parseIdeasQuery, SORTS, type IdeaList, type IdeasQuery } from "./data";

// The wall of posters with its board chips and filters, shared by the Ideas
// list (#61) and the In progress list (#63). Filters live in the URL.
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  list: IdeaList;
  // The page this wall is on, for chip links and the filter form.
  path: "/" | "/in-progress";
};

export async function Wall({ searchParams, list, path }: Props) {
  const query = parseIdeasQuery(await searchParams, list);
  const ideas = listIdeas(query, list);
  return (
    <section aria-label="Ideas" className="flex flex-col gap-5">
      <nav aria-label="Boards" className="flex flex-wrap gap-2">
        <BoardFilter label="All boards" selected={!query.board} href={hrefFor(path, query, undefined)} />
        {BOARD_CODES.map((code) => (
          <BoardFilter
            key={code}
            label={BOARDS[code].category}
            color={BOARDS[code].color}
            selected={query.board === code}
            href={hrefFor(path, query, code)}
          />
        ))}
      </nav>
      {/* Keyed by the query, so the fields reset when a chip or Back changes the URL. */}
      <IdeaFilters
        key={JSON.stringify(query)}
        action={path}
        q={query.q}
        board={query.board}
        status={query.status}
        sort={query.sort}
        statuses={
          list === "open" ? OPEN_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })) : undefined
        }
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
function hrefFor(path: string, query: IdeasQuery, board: BoardCode | undefined) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (board) params.set("board", board);
  if (query.status) params.set("status", query.status);
  if (query.sort !== "support") params.set("sort", query.sort);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
