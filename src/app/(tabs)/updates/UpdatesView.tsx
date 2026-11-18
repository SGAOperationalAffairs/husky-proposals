"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Clock, ListChecks, X, type LucideIcon } from "lucide-react";
import { BoardChip } from "@/components/BoardChip";
import { Button } from "@/components/Button";
import { BOARDS } from "@/core/boards";
import { STATUS_LABELS } from "@/core/statuses";
import { SelectField } from "@/components/Field";
import type { BoardCode } from "@/core/boards";
import type { UpdateRow } from "./sample";

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
// past updates open from the last-update line. Posting is not wired yet; the page reads
// sample rows until the update queries land.

const CADENCE_DAYS = 30; // monthly by default, per board (#12)

const TEMPLATES = [
  {
    id: "formed",
    label: "Committee formed",
    text: "The board has formed a committee to work on this. We will share the first meeting date soon.",
  },
  {
    id: "met",
    label: "Meeting held",
    text: "The board committee met this week. We reviewed the plan and agreed on next steps: [add the steps].",
  },
  { id: "mile", label: "Milestone reached", text: "We reached a milestone: [describe it]." },
  {
    id: "late",
    label: "Delayed",
    text: "This is taking longer than planned because [reason]. New expected timing: [date].",
  },
  { id: "custom", label: "Write my own", text: "" },
] as const;

const STATUS_CHOICES = [
  { id: "keep", label: "Keep as In progress" },
  { id: "deliver", label: "Mark as Delivered" },
] as const;

const chip = "poster-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold";
const control = "rounded-field bordered bg-surface w-full px-3 py-2";
const label = "text-sm font-semibold";

function dueText(daysSince: number): { text: string; due: boolean } {
  const left = CADENCE_DAYS - daysSince;
  return left <= 0
    ? { text: `Due ${-left} days ago`, due: true }
    : { text: `Due in ${left} days`, due: false };
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

// One idea's update panel: the title, the template, status, the text, who it goes to, and the
// one preview. Past updates stay on the row.
function Composer({ idea, onClose }: { idea: UpdateRow; onClose: () => void }) {
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["id"]>("formed");
  const [body, setBody] = useState<string>(TEMPLATES[0].text);
  const [status, setStatus] = useState<(typeof STATUS_CHOICES)[number]["id"]>("keep");
  const [audience, setAudience] = useState<"followers" | "both">("followers");
  const text = body || "Your update appears here.";
  return (
    <div className="updates-fade relative flex flex-col gap-4 bordered bg-surface p-card">
      <h3 className="pr-10 heading text-3xl">New update on {idea.title}</h3>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-1">
        <X aria-hidden className="size-5" />
      </button>
      <Button variant="primary" outlined href={`/ideas/${idea.number}`}>
        Go to idea
      </Button>
      <label className="flex flex-col gap-1">
        <span className={label}>Start from</span>
        <select
          value={template}
          onChange={(e) => {
            const t = TEMPLATES.find((x) => x.id === e.target.value) ?? TEMPLATES[0];
            setTemplate(t.id);
            setBody(t.text);
          }}
          className={control}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_CHOICES)[number]["id"])}
          className={control}
        >
          {STATUS_CHOICES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>What students will read</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={control} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Send to</span>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as "followers" | "both")}
          className={control}
        >
          <option value="followers">Followers ({idea.fol})</option>
          <option value="both">Followers and supporters ({idea.sup})</option>
        </select>
      </label>
      <div className="bg-paper-ink p-3 text-sm text-paper">
        <b>
          Proposal {idea.number}: {idea.title}
        </b>
        <br />
        {text.length > 110 ? `${text.slice(0, 108)}...` : text}
      </div>
      <div>
        <Button variant="primary">
          <Bell aria-hidden className="size-4" />
          Post update
        </Button>
      </div>
    </div>
  );
}

export function UpdatesView({
  rows,
  boards,
}: {
  rows: UpdateRow[];
  // The boards this viewer may update: all five for the VP, one for a chair or director.
  boards: { value: BoardCode; label: string }[];
}) {
  const [onlyDue, setOnlyDue] = useState(false);
  const [board, setBoard] = useState<BoardCode | undefined>(undefined);
  const [sort, setSort] = useState<UpdatesSort>("due");
  const [target, setTarget] = useState<number | null>(null);
  const [pastOpen, setPastOpen] = useState<number | null>(null);

  const shown = rows
    .map((r) => ({ ...r, ...dueText(r.daysSince) }))
    .filter((r) => !board || r.board === board)
    .filter((r) => !onlyDue || r.due)
    .sort((a, b) => {
      switch (sort) {
        case "support":
          return b.sup - a.sup;
        case "newest":
          return b.number - a.number;
        case "updated":
          return a.daysSince - b.daysSince;
        default:
          return Number(b.due) - Number(a.due);
      }
    });
  const open = rows.find((r) => r.number === target) ?? null;

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
        <div className="min-w-0">
          <ul className="flex flex-col gap-3">
            {shown.map((r) => {
              const pastIsOpen = pastOpen === r.number;
              return (
                <li
                  key={r.number}
                  data-board={BOARDS[r.board].color}
                  className="flex flex-col gap-1 bordered bg-surface p-card"
                >
                  <div className="flex items-center gap-x-3">
                    <BoardChip board={r.board} />
                    <button
                      type="button"
                      onClick={() => setTarget(r.number)}
                      aria-pressed={target === r.number}
                      className="min-w-0 flex-1 truncate text-left heading text-2xl underline-offset-4 hover:underline"
                    >
                      {r.title}
                    </button>
                    <span className="bordered px-2 py-0.5 text-xs font-bold">{STATUS_LABELS[r.status]}</span>
                    <span
                      className={`shrink-0 px-2 py-0.5 text-xs font-bold whitespace-nowrap ${
                        r.due ? "bg-accent text-on-accent" : "bordered text-muted"
                      }`}
                    >
                      {r.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-expanded={pastIsOpen}
                    onClick={() => setPastOpen(pastIsOpen ? null : r.number)}
                    className="flex w-full items-center gap-1 text-left text-sm text-muted"
                  >
                    Last update: {r.last}
                    <ChevronDown
                      aria-hidden
                      className={`size-4 shrink-0 transition-transform ${pastIsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {/* Kept in the page and eased open or closed (updates-collapse, globals.css). */}
                  <div
                    className="updates-collapse"
                    data-open={pastIsOpen ? "true" : "false"}
                    inert={!pastIsOpen}
                  >
                    <div>
                      <ul className="flex flex-col gap-1 text-sm text-muted">
                        {r.past.map((p) => (
                          <li key={p.daysAgo}>
                            {p.daysAgo} days ago: {p.text}
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
        {open && <Composer key={open.number} idea={open} onClose={() => setTarget(null)} />}
      </aside>
    </div>
  );
}
