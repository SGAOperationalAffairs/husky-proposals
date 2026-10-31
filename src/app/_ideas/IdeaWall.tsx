"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, type AnimationEvent } from "react";
import { BoardFilter } from "@/components/BoardFilter";
import { IdeaCard, type IdeaCardData } from "@/components/IdeaCard";
import { IdeaFilters } from "@/components/IdeaFilters";
import { BOARD_CODES, BOARDS, type BoardCode } from "@/core/boards";
import { STATUS_LABELS } from "@/core/statuses";
import {
  filterIdeas,
  ideasHref,
  OPEN_STATUSES,
  parseIdeasQuery,
  SORTS,
  type IdeaList,
  type IdeasQuery,
} from "./filter";
import { arrivalSteps } from "./arrival";
import { useLocalTaps } from "./useLocalTaps";

// The wall of posters with its board chips and filters (#61, #63). The list's
// ideas arrive once; every search, sort, and chip filters them here and redraws
// only the cards, with no request to the server. The URL still changes, through
// history.pushState, which Next keeps in step with useSearchParams, so filtered
// walls can be shared and Back works.
type Props = {
  ideas: IdeaCardData[];
  list: IdeaList;
  // The page this wall is on, for chip links and the form without JavaScript.
  path: "/" | "/in-progress";
};

const SORT_OPTIONS = Object.entries(SORTS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = OPEN_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

export function IdeaWall({ ideas, list, path }: Props) {
  const params = useSearchParams();
  const urlKey = params.toString();
  // The filters update in the same click, so dropdowns never flick back while
  // the URL catches up, and follow the URL when it changes some other way (Back).
  const [query, setQuery] = useState<IdeasQuery>(() => parseIdeasQuery(Object.fromEntries(params), list));
  const [seenKey, setSeenKey] = useState(urlKey);
  if (seenKey !== urlKey) {
    setSeenKey(urlKey);
    setQuery(parseIdeasQuery(Object.fromEntries(params), list));
  }

  const apply = (change: Partial<Record<keyof IdeasQuery, string | undefined>>) => {
    const next = parseIdeasQuery({ ...query, ...change }, list);
    const href = ideasHref(path, next);
    setQuery(next);
    setSeenKey(href.split("?")[1] ?? "");
    window.history.pushState(null, "", href);
  };

  const taps = useLocalTaps();
  const shown = useMemo(() => filterIdeas(ideas, query, list), [ideas, query, list]);

  // The posters that rise in when the wall first arrives (#84), with their
  // steps. Taken once, from the URL's filters, so the server and the first
  // render agree. Each poster leaves the map when its rise ends, so a filter
  // never moves it again.
  const [arriving, setArriving] = useState<Map<number, number> | null>(() =>
    arrivalSteps(
      filterIdeas(ideas, parseIdeasQuery(Object.fromEntries(params), list), list).map((i) => i.number),
    ),
  );
  const onRiseEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName !== "rise") return;
    const number = Number((event.target as HTMLElement).dataset.idea);
    setArriving((prev) => {
      if (!prev?.has(number)) return prev;
      const next = new Map(prev);
      next.delete(number);
      return next.size > 0 ? next : null;
    });
  };
  const chip = (board: BoardCode | undefined) => ({
    href: ideasHref(path, { ...query, board }),
    onSelect: () => apply({ board }),
  });

  return (
    <section aria-label="Ideas" className="flex flex-col gap-5">
      <nav aria-label="Boards" className="flex flex-wrap gap-2">
        <BoardFilter label="All boards" selected={!query.board} {...chip(undefined)} />
        {BOARD_CODES.map((code) => (
          <BoardFilter
            key={code}
            label={BOARDS[code].category}
            color={BOARDS[code].color}
            selected={query.board === code}
            {...chip(code)}
          />
        ))}
      </nav>
      <IdeaFilters
        action={path}
        q={query.q}
        board={query.board}
        status={query.status}
        sort={query.sort}
        statuses={list === "open" ? STATUS_OPTIONS : undefined}
        sorts={SORT_OPTIONS}
        onChange={apply}
      />
      <p role="status" className="text-sm text-muted">
        {shown.length === 1 ? "1 idea" : `${shown.length} ideas`}
      </p>
      {shown.length > 0 ? (
        <div className="card-grid" onAnimationEnd={onRiseEnd}>
          {shown.map((idea) => (
            <IdeaCard
              key={idea.number}
              {...idea}
              {...taps(idea.number, idea.board)}
              arrival={arriving?.get(idea.number)}
            />
          ))}
        </div>
      ) : (
        <p className="bordered bg-surface p-card">No ideas match. Try a different search or another board.</p>
      )}
    </section>
  );
}
