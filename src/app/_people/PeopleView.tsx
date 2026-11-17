"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleDashed,
  ListChecks,
  ListX,
  Mail,
  PauseCircle,
  Send,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BoardChip } from "@/components/BoardChip";
import { Button } from "@/components/Button";
import { SelectField } from "@/components/Field";
import { IdeaSearch } from "@/components/IdeaSearch";
import type { BoardCode } from "@/core/boards";
import {
  contactBy,
  countByStatus,
  daysUntil,
  filterPeople,
  toListStatus,
  type ListStatus,
  type PersonRow,
} from "@/core/people";
import { setContactStatusAction } from "./actions";
import { ConfirmMarkDialog, type MarkTo } from "./ConfirmMarkDialog";

// The People leader tab (#129), in the look the playground settled on: one list with checkboxes,
// status chips, an idea search, a board dropdown, and a bar at the bottom for the picked rows.
// Rows come from the server already limited to the viewer's boards.

// Each status has one icon, used on its filter chip and on the bar's action for it.
const STATUS_ORDER: { id: ListStatus | "all"; label: string; icon: LucideIcon }[] = [
  { id: "to_contact", label: "To contact", icon: CircleDashed },
  { id: "contacted", label: "Contacted", icon: Send },
  { id: "joined", label: "Joined", icon: UserCheck },
  { id: "not_now", label: "Not now", icon: PauseCircle },
  { id: "all", label: "All", icon: Users },
];

const STATUS_LABEL: Record<ListStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  joined: "Joined",
  not_now: "Not now",
};

// The contact date in plain words. Overdue sorts to the top and is marked with the accent.
function contactText(days: number): string {
  if (days < 0) return `${-days} ${-days === 1 ? "day" : "days"} overdue`;
  if (days === 0) return "Contact today";
  return `Contact in ${days} ${days === 1 ? "day" : "days"}`;
}

const keyOf = (r: PersonRow) => `${r.userId}:${r.ideaId}`;

export function PeopleView({
  rows,
  boards,
  now,
  initialIdea,
}: {
  rows: PersonRow[];
  boards: { value: BoardCode; label: string }[];
  now: string; // the server's clock, so the first paint matches the server's
  initialIdea: string;
}) {
  const router = useRouter();
  const nowDate = useMemo(() => new Date(now), [now]);

  const ideaOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const r of rows) if (!seen.has(r.ideaNumber)) seen.set(r.ideaNumber, r.ideaTitle);
    return [
      { value: "all", label: "All ideas" },
      ...[...seen.entries()]
        .sort(([a], [b]) => a - b)
        .map(([number, title]) => ({ value: String(number), label: `#${number} ${title}` })),
    ];
  }, [rows]);

  const [status, setStatus] = useState<ListStatus | "all">("to_contact");
  const [idea, setIdea] = useState(ideaOptions.some((o) => o.value === initialIdea) ? initialIdea : "all");
  const [board, setBoard] = useState<BoardCode | "all">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  // The bulk action waiting for the leader's confirmation. Nothing is saved until they confirm.
  const [confirming, setConfirming] = useState<MarkTo | null>(null);

  // Changing a filter drops the picks. A row picked under one filter must not be saved under
  // another, where the leader can no longer see it (#129 review).
  const narrow =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPicked(new Set());
      setAnchor(null);
    };
  const narrowStatus = narrow(setStatus);
  const narrowIdea = narrow(setIdea);
  const narrowBoard = narrow(setBoard);

  const scope = { idea, board };
  const counts = countByStatus(rows, scope);
  const shown = filterPeople(rows, { status, ...scope }, nowDate);
  const shownKeys = shown.map(keyOf);

  // Shift+click takes the state of the box clicked, and applies it to every row in between.
  const togglePick = (key: string, shift: boolean) => {
    const from = anchor === null ? -1 : shownKeys.indexOf(anchor);
    const to = shownKeys.indexOf(key);
    const target = !picked.has(key);
    setPicked((prev) => {
      const next = new Set(prev);
      const range =
        shift && from >= 0 && to >= 0 ? shownKeys.slice(Math.min(from, to), Math.max(from, to) + 1) : [key];
      for (const k of range) {
        if (target) next.add(k);
        else next.delete(k);
      }
      return next;
    });
    setAnchor(key);
  };

  const allShown = shown.length > 0 && shownKeys.every((k) => picked.has(k));
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const k of shownKeys) {
        if (allShown) next.delete(k);
        else next.add(k);
      }
      return next;
    });

  // Back to To contact, Joined, and Not now. Each row is saved on its own; rows that save leave the selection, and a
  // failure keeps the rest picked and says so.
  const mark = (to: MarkTo) => {
    const targets = rows.filter((r) => picked.has(keyOf(r)));
    setFailed(false);
    setConfirming(null);
    startTransition(async () => {
      const results = await Promise.all(
        targets.map((r) => setContactStatusAction({ userId: r.userId, ideaId: r.ideaId, status: to })),
      );
      const done = new Set(targets.filter((_, i) => results[i]?.ok).map(keyOf));
      setPicked((prev) => new Set([...prev].filter((k) => !done.has(k))));
      if (done.size < targets.length) setFailed(true);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="heading text-6xl @3xl:text-8xl">People</h1>
      <p className="max-w-prose text-muted">
        Students who tapped &quot;I&apos;ll participate&quot; and agreed to be contacted. Each gets a contact
        date a few days after signing up.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={status === s.id ? "primary" : "plain"}
              aria-pressed={status === s.id}
              onClick={() => narrowStatus(s.id)}
            >
              <s.icon aria-hidden className="size-4" />
              {s.label} <span className="tabular-nums">{counts[s.id]}</span>
            </Button>
          ))}
        </div>

        <IdeaSearch options={ideaOptions} value={idea} onChange={narrowIdea} />

        <SelectField
          label="Board"
          hideLabel
          compact
          value={board}
          onChange={(e) => narrowBoard(e.target.value as BoardCode | "all")}
        >
          <option value="all">All boards</option>
          {boards.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </SelectField>
      </div>

      {shown.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <Button size="sm" variant={allShown ? "primary" : "plain"} onClick={toggleAll}>
            {/* Both labels share one cell, so the button is as wide as "Deselect all" and never changes size. */}
            <span className="inline-grid">
              <span aria-hidden className="invisible col-start-1 row-start-1 inline-flex items-center gap-2">
                <ListX className="size-4" />
                Deselect all
              </span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-2">
                {allShown ? (
                  <ListX aria-hidden className="size-4" />
                ) : (
                  <ListChecks aria-hidden className="size-4" />
                )}
                {allShown ? "Deselect all" : "Select all"}
              </span>
            </span>
          </Button>
          <span className="text-sm text-muted">{shown.length} shown</span>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="bordered bg-surface p-card text-muted">
          Nobody here. Nice work, or nobody has offered yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line bordered bg-surface">
          {shown.map((r) => {
            const key = keyOf(r);
            const listStatus = toListStatus(r.contactStatus);
            const days = daysUntil(contactBy(r.signedUpAt), nowDate);
            const overdue = r.contactStatus === "new" && days < 0;
            const checked = picked.has(key);
            const expanded = openKey === key;
            return (
              <li key={key} className="flex flex-wrap items-start gap-3 p-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`Select ${r.name}`}
                  onClick={(e) => togglePick(key, e.shiftKey)}
                  className="mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center select-none"
                >
                  <span
                    aria-hidden
                    className={`grid size-5 place-items-center bordered ${checked ? "bg-accent text-on-accent" : "bg-surface"}`}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>

                <div className="flex w-44 shrink-0 flex-col">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenKey(expanded ? null : key)}
                    className="self-start text-left font-bold underline-offset-4 hover:underline"
                  >
                    {r.name}
                  </button>
                  {expanded && (
                    <a className="text-sm text-muted underline underline-offset-4" href={`mailto:${r.email}`}>
                      {r.email}
                    </a>
                  )}
                </div>

                <div className="w-60 shrink-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="tabular-nums">#{r.ideaNumber}</span>
                    <span className="min-w-0 truncate" title={r.ideaTitle}>
                      {r.ideaTitle}
                    </span>
                  </p>
                </div>

                <div className="w-32 shrink-0">
                  <BoardChip board={r.board} />
                </div>

                <div className="ml-auto flex shrink-0 items-start justify-end gap-3 whitespace-nowrap">
                  {listStatus === "to_contact" && (
                    <span
                      className="px-2 py-0.5 text-xs font-bold whitespace-nowrap"
                      style={overdue ? { background: "var(--accent)", color: "var(--on-accent)" } : undefined}
                    >
                      {contactText(days)}
                    </span>
                  )}
                  <span className="bordered px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                    {overdue ? "Overdue" : STATUS_LABEL[listStatus]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* A bar at the bottom of the screen. It takes no room in the list, so ticking a row never
          moves anything. */}
      {picked.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 bordered bg-surface p-3 surface-float">
            <span className="text-sm font-bold whitespace-nowrap" aria-live="polite">
              {picked.size} selected
            </span>
            <Button size="sm" variant="primary" disabled title="Email is coming soon.">
              <Mail aria-hidden className="size-4" />
              Message selected
            </Button>
            <Button size="sm" variant="plain" disabled={pending} onClick={() => setConfirming("new")}>
              <CircleDashed aria-hidden className="size-4" />
              Mark to contact
            </Button>
            <Button size="sm" variant="plain" disabled={pending} onClick={() => setConfirming("joined")}>
              <UserCheck aria-hidden className="size-4" />
              Mark joined
            </Button>
            <Button size="sm" variant="plain" disabled={pending} onClick={() => setConfirming("later")}>
              <PauseCircle aria-hidden className="size-4" />
              Mark not now
            </Button>
            <Button size="sm" variant="plain" onClick={() => setPicked(new Set())}>
              <X aria-hidden className="size-4" />
              Clear
            </Button>
            {failed && (
              <span className="basis-full text-sm text-muted">Some changes did not save. Try again.</span>
            )}
          </div>
        </div>
      )}
      <ConfirmMarkDialog
        to={confirming}
        count={picked.size}
        busy={pending}
        onConfirm={() => confirming && mark(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
