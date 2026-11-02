"use client";

import { useState, type ReactNode } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaFilters } from "@/components/IdeaFilters";
import { BOARD_CODES, BOARDS, type BoardCode } from "@/core/boards";
import { IDEA_STATUSES, STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import { filterIdeas, SORTS, type IdeasQuery } from "@/app/_ideas/filter";
import { IDEAS } from "../sample";

// The filter bar as the real list shows it (#61, #55): the real IdeaFilters with
// sample ideas, filtered by the real filterIdeas, so the layout and the counts
// are honest. One list, with a Status filter over every status.
const SORT_OPTIONS = Object.entries(SORTS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = IDEA_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

export function FiltersSection() {
  return (
    <div className="flex flex-col gap-10">
      <Demo title="Ideas list, wide" statuses={STATUS_OPTIONS} cards />
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold">Phone width (390px)</h3>
        <Phone>
          <Demo title="Ideas list" statuses={STATUS_OPTIONS} />
        </Phone>
      </div>
    </div>
  );
}

// A phone-width box. Its own container, so the filter bar takes the phone layout
// whatever the width of the preview around it.
function Phone({ children }: { children: ReactNode }) {
  return <div className="@container w-full max-w-sm">{children}</div>;
}

function Demo({
  title,
  statuses,
  cards = false,
}: {
  title: string;
  statuses?: { value: IdeaStatus; label: string }[];
  cards?: boolean;
}) {
  const [query, setQuery] = useState<IdeasQuery>({ sort: "support" });
  const shown = filterIdeas(IDEAS, query);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <IdeaFilters
        action="/"
        q={query.q}
        board={query.board}
        status={query.status}
        sort={query.sort}
        statuses={statuses}
        sorts={SORT_OPTIONS}
        boards={
          <div role="group" aria-label="Board" className="flex flex-wrap gap-2">
            <BoardFilter
              label="All boards"
              selected={!query.board}
              onClick={() => setQuery({ ...query, board: undefined })}
            />
            {BOARD_CODES.map((code: BoardCode) => (
              <BoardFilter
                key={code}
                label={BOARDS[code].category}
                color={BOARDS[code].color}
                selected={query.board === code}
                onClick={() => setQuery({ ...query, board: code })}
              />
            ))}
          </div>
        }
        onChange={(change) =>
          setQuery((prev) => ({
            ...prev,
            q: change.q === undefined ? prev.q : change.q || undefined,
            status:
              change.status === undefined
                ? prev.status
                : ((change.status || undefined) as IdeaStatus | undefined),
            sort: (change.sort ?? prev.sort) as IdeasQuery["sort"],
          }))
        }
      />
      <p role="status" className="text-sm text-muted">
        {shown.length === 1 ? "1 idea" : `${shown.length} ideas`}
      </p>
      {cards &&
        (shown.length > 0 ? (
          <div className="card-grid">
            {shown.map((i) => (
              <IdeaCard key={i.number} {...i} />
            ))}
          </div>
        ) : (
          <p className="bordered bg-surface p-card">
            No ideas match. Try a different search or another board.
          </p>
        ))}
    </div>
  );
}
