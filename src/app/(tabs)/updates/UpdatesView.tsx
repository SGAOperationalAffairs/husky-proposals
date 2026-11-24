"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Clock, ListChecks, X, type LucideIcon } from "lucide-react";
import { usePostUpdate, type UpdateTargetData } from "@/app/_updates/usePostUpdate";
import type { UpdateRowData } from "@/app/_updates/present";
import { BoardChip } from "@/components/BoardChip";
import { Button } from "@/components/Button";
import { SelectField, TextArea } from "@/components/Field";
import { daysAgoText } from "@/core/days";
import { UpdateList, capitalize } from "@/components/UpdateList";
import { BOARDS } from "@/core/boards";
import type { BoardCode } from "@/core/boards";
import { UPDATE_BODY_MAX, UPDATE_TEMPLATES, type UpdateTemplateId } from "@/core/updates";

// The sort options are the ideas page's (filter.ts SORTS), with Due first as the default.
type UpdatesSort = "due" | "support" | "newest" | "updated";
const SORT_LABELS: Record<UpdatesSort, string> = {
  due: "Due first",
  support: "Most supported",
  newest: "Newest",
  updated: "Recently updated",
};

// The Updates leader tab (#130), as the playground settled it: the ideas in progress, due
// ones first, a click on an idea's title opens its update panel beside the list, and the
// past updates open from the last-update line. Posting goes through usePostUpdate, the one
// hook for it (#131 calls the same).

const chip = "poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold";

const targetOf = (row: UpdateRowData): UpdateTargetData => ({
  id: row.id,
  number: row.number,
  boardId: row.board,
  cadenceDays: row.cadenceDays,
});

function reachText(followers: number): string {
  if (followers === 0) return "No one follows this idea yet, so no email goes out.";
  return `Emails its ${followers} ${followers === 1 ? "follower" : "followers"}.`;
}

function Filter({
  text,
  icon: Icon,
  pressed,
  onClick,
}: {
  text: string;
  icon: LucideIcon;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={chip}>
      <Icon aria-hidden className="size-4" />
      {text}
    </button>
  );
}

type Poster = ReturnType<typeof usePostUpdate>;

// One idea's update panel: the title, the template, the text, how many followers it emails,
// and the one preview, which is the idea page's Updates list. Past updates stay on the row.
function Composer({
  idea,
  poster,
  errorHere,
  onClose,
}: {
  idea: UpdateRowData;
  poster: Poster;
  // True when the hook's last error came from this idea, so another row's error stays off.
  errorHere: boolean;
  // Closes the panel and puts focus back on the idea's title, after a post or by hand.
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<UpdateTemplateId>(UPDATE_TEMPLATES[0].id);
  const [body, setBody] = useState<string>(UPDATE_TEMPLATES[0].text);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const busy = poster.busy !== null;
  const error = errorHere ? poster.error : null;

  // Opening the panel moves focus to its heading, so a keyboard user lands in it (#130).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const draft = body.trim();
  const preview = [
    ...(draft ? [{ key: "draft", daysAgo: 0, text: draft }] : []),
    ...idea.past.map((p) => ({ key: p.id, daysAgo: p.daysAgo, text: p.text })),
  ];

  async function post(kind: "board" | "check_in") {
    if (busy) return;
    const ok =
      kind === "board" ? await poster.post(targetOf(idea), body) : await poster.checkIn(targetOf(idea));
    if (ok) onClose();
  }

  return (
    <div
      className="updates-fade relative flex flex-col gap-4 bordered bg-surface p-card"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <h3 ref={headingRef} tabIndex={-1} className="pr-10 heading text-3xl">
        New update on {idea.title}
      </h3>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-1">
        <X aria-hidden className="size-5" />
      </button>
      <Button variant="primary" outlined href={`/ideas/${idea.number}`}>
        Go to idea
      </Button>
      <SelectField
        label="Start from"
        value={template}
        onChange={(e) => {
          const t = UPDATE_TEMPLATES.find((x) => x.id === e.target.value) ?? UPDATE_TEMPLATES[0];
          setTemplate(t.id);
          setBody(t.text);
          poster.clearError();
        }}
      >
        {UPDATE_TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </SelectField>
      <TextArea
        label="What students will read"
        value={body}
        max={UPDATE_BODY_MAX}
        rows={4}
        error={error?.field === "body" ? error.text : undefined}
        onChange={(e) => {
          setBody(e.target.value);
          if (error?.field === "body") poster.clearError();
        }}
      />
      <p className="text-sm text-muted">{reachText(idea.followerCount)}</p>
      <section aria-label="Preview" className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">What students see on the idea page</h4>
        <div className="flex flex-col gap-3 bg-surface p-card surface-float">
          {!draft && <p className="text-muted">Your update appears here.</p>}
          <UpdateList updates={preview} />
        </div>
      </section>
      {error && !error.field && (
        <p role="alert" className="text-sm font-semibold text-accent-text">
          {error.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          aria-disabled={busy}
          icon={<Bell className="size-4" />}
          onClick={() => void post("board")}
        >
          {poster.busy === "board" ? "Posting…" : "Post update"}
        </Button>
        <Button variant="line" aria-disabled={busy} onClick={() => void post("check_in")}>
          {poster.busy === "check_in" ? "Posting…" : "Still working, no news"}
        </Button>
      </div>
    </div>
  );
}

export function UpdatesView({
  rows,
  boards,
}: {
  rows: UpdateRowData[];
  // The boards this viewer may update: all five for the VP, one for a chair or director.
  boards: { value: BoardCode; label: string }[];
}) {
  const [onlyDue, setOnlyDue] = useState(false);
  const [board, setBoard] = useState<BoardCode | undefined>(undefined);
  const [sort, setSort] = useState<UpdatesSort>("due");
  const [target, setTarget] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState<string | null>(null);
  // The idea the hook's last call was for, so its error shows on that idea only.
  const [acting, setActing] = useState<string | null>(null);
  const poster = usePostUpdate();
  const titles = useRef(new Map<string, HTMLButtonElement>());

  const inBoard = rows.filter((r) => !board || r.board === board);
  const shown = inBoard
    .filter((r) => !onlyDue || r.due)
    .sort((a, b) => {
      switch (sort) {
        case "support":
          return b.supportCount - a.supportCount;
        case "newest":
          return b.number - a.number;
        case "updated":
          return (a.last?.daysAgo ?? Infinity) - (b.last?.daysAgo ?? Infinity);
        default:
          // The date the next update is due, soonest first. No date means no activity at all.
          return (a.dueAt ? Date.parse(a.dueAt) : -Infinity) - (b.dueAt ? Date.parse(b.dueAt) : -Infinity);
      }
    });
  const open = rows.find((r) => r.id === target) ?? null;
  const orphanError = poster.error && !rows.some((r) => r.id === acting) ? poster.error : null;

  const focusTitle = (id: string) => titles.current.get(id)?.focus();

  function openComposer(id: string) {
    poster.clearError();
    setActing(id);
    setTarget(id);
  }

  function closeComposer() {
    if (!open) return;
    poster.clearError();
    setTarget(null);
    focusTitle(open.id);
  }

  // The Still working line on a row. The row's chip clears after the refresh, and the
  // button goes with it, so focus moves to the title first (#130).
  async function checkIn(row: UpdateRowData) {
    if (poster.busy) return;
    poster.clearError();
    setActing(row.id);
    if (await poster.checkIn(targetOf(row))) focusTitle(row.id);
  }

  // The panel floats at the middle of the window. Its top is the space that centers it, so
  // it can't move past the top of the list (sticky stops at the grid's edge), and it still
  // centers when it is shorter than the window (#130).
  const asideRef = useRef<HTMLElement>(null);
  const [top, setTop] = useState(0);
  const hasOpen = open !== null;
  useLayoutEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const place = () => setTop(Math.max(0, (window.innerHeight - el.offsetHeight) / 2));
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [hasOpen]);

  let emptyText: string | null = null;
  if (rows.length === 0) {
    emptyText = "No ideas in progress on your boards. When a board starts one, it shows here.";
  } else if (inBoard.length === 0) {
    emptyText = "No ideas in progress on this board.";
  } else if (shown.length === 0) {
    emptyText = "Nothing is due. Every idea in progress has a recent update.";
  }

  return (
    // updates-grid (globals.css) gives the list the whole width until a row opens; then the
    // panel's column grows from the right and the list gives it room (#130).
    <div className="updates-grid gap-6" data-open={open ? "true" : "false"}>
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="heading text-6xl @3xl:text-8xl">Updates</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Filter text="All" icon={ListChecks} pressed={!onlyDue} onClick={() => setOnlyDue(false)} />
          <Filter text="Due for an update" icon={Clock} pressed={onlyDue} onClick={() => setOnlyDue(true)} />
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="w-44 min-w-0">
              <SelectField
                label="Board"
                hideLabel
                compact
                disabled={boards.length <= 1}
                value={board ?? ""}
                onChange={(e) => setBoard((e.target.value || undefined) as BoardCode | undefined)}
              >
                {boards.length > 1 && <option value="">All boards</option>}
                {boards.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="w-44 min-w-0">
              <SelectField
                label="Sort by"
                hideLabel
                compact
                value={sort}
                onChange={(e) => setSort(e.target.value as UpdatesSort)}
              >
                {(Object.keys(SORT_LABELS) as UpdatesSort[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted">Click on an idea to post an update.</p>
        {/* An idea that left the list after a refresh (no longer in progress) has no row to
            carry its message, so it shows here. */}
        {orphanError && (
          <p role="alert" className="text-sm font-semibold text-accent-text">
            {orphanError.text}
          </p>
        )}
        <div className="min-w-0">
          {emptyText && <p className="text-muted">{emptyText}</p>}
          <ul className="flex flex-col gap-3">
            {shown.map((r) => {
              const pastIsOpen = pastOpen === r.id;
              const checkingIn = poster.busy === "check_in" && acting === r.id;
              const rowError = poster.error && acting === r.id && target !== r.id ? poster.error : null;
              return (
                <li
                  key={r.id}
                  data-board={BOARDS[r.board].color}
                  className="flex flex-col gap-1 bordered bg-surface p-card"
                >
                  <div className="flex items-center gap-x-3">
                    <BoardChip board={r.board} />
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) titles.current.set(r.id, el);
                        else titles.current.delete(r.id);
                      }}
                      onClick={() => openComposer(r.id)}
                      aria-pressed={target === r.id}
                      className="min-w-0 flex-1 truncate text-left heading text-2xl underline-offset-4 hover:underline"
                    >
                      {r.title}
                    </button>
                    {/* The words carry the meaning, so color is never the only signal. */}
                    <span
                      className={`shrink-0 px-2 py-0.5 text-xs font-bold whitespace-nowrap ${
                        r.due ? "bg-accent text-on-accent" : "bordered text-muted"
                      }`}
                    >
                      {r.dueText}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    {r.last ? (
                      <button
                        type="button"
                        aria-expanded={pastIsOpen}
                        onClick={() => setPastOpen(pastIsOpen ? null : r.id)}
                        className="flex min-w-0 items-center gap-1 text-left text-sm text-muted"
                      >
                        Last update, {daysAgoText(r.last.daysAgo)}: {r.last.text}
                        <ChevronDown
                          aria-hidden
                          className={`size-4 shrink-0 transition-transform ${pastIsOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    ) : (
                      <p className="text-sm text-muted">No updates yet</p>
                    )}
                    {r.due && (
                      <Button
                        variant="line"
                        size="sm"
                        aria-disabled={poster.busy !== null}
                        onClick={() => void checkIn(r)}
                      >
                        {checkingIn ? "Posting…" : "Still working, no news"}
                      </Button>
                    )}
                  </div>
                  {rowError && (
                    <p role="alert" className="text-sm font-semibold text-accent-text">
                      {rowError.text}
                    </p>
                  )}
                  {/* Kept in the page and eased open or closed (updates-collapse, globals.css). */}
                  <div
                    className="updates-collapse"
                    data-open={pastIsOpen ? "true" : "false"}
                    inert={!pastIsOpen}
                  >
                    <div>
                      <ul className="flex flex-col gap-1 text-sm text-muted">
                        {r.past.map((p) => (
                          <li key={p.id}>
                            {capitalize(daysAgoText(p.daysAgo))}: {p.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <aside
        ref={asideRef}
        aria-label="Update"
        style={{ top }}
        className="updates-panel min-w-0 self-start @3xl:sticky @3xl:max-h-screen @3xl:overflow-x-hidden @3xl:overflow-y-auto"
      >
        {open && (
          <Composer
            key={open.id}
            idea={open}
            poster={poster}
            errorHere={acting === open.id}
            onClose={closeComposer}
          />
        )}
      </aside>
    </div>
  );
}
