"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ViewSwitch } from "@/components/ViewSwitch";
import { Tabs } from "@/components/Tabs";
import { SelectField } from "@/components/Field";
import { STATUS_LABELS, IDEA_STATUSES, type IdeaStatus } from "@/core/statuses";
import type { BoardCode } from "@/core/boards";
import {
  filterQueue,
  parseQueueView,
  QUEUE_SORTS,
  type QueueItem,
  type QueueSort,
  type QueueView as ViewName,
} from "@/core/queue";
import type { ApprovedRowData, ReviewRowData } from "@/app/_review/present";
import { QueueCard } from "./QueueCard";
import { QueueHeader, QueueRow, type Highlight, type RowStyle } from "./QueueRow";
import { ReviewList } from "./ReviewList";

// The queue's two tabs and its filters (#124). The "To review" tab carries the
// red count of pending posts; the Ideas tab has no count.
type Tab = "review" | "ideas";

const SORT_OPTIONS = Object.entries(QUEUE_SORTS).map(([value, label]) => ({ value, label }));

export function QueueView({
  items,
  review,
  boards,
  rowStyle = "tag",
  panel = true,
  highlight = "status",
  titleUnderline = false,
  view: initialView = "list",
}: {
  // The Ideas tab's rows. Post items are ignored: pending posts come from `review` (#59).
  items: QueueItem[];
  review: { pending: ReviewRowData[]; approved: ApprovedRowData[] };
  boards: { value: BoardCode; label: string }[];
  rowStyle?: RowStyle;
  panel?: boolean;
  highlight?: Highlight;
  titleUnderline?: boolean;
  view?: ViewName;
}) {
  const [view, setView] = useState<ViewName>(initialView);
  const [tab, setTab] = useState<Tab>("review");
  const [board, setBoard] = useState<BoardCode | undefined>(undefined);
  const [status, setStatus] = useState<IdeaStatus | undefined>(undefined);
  const [sort, setSort] = useState<QueueSort>("support");

  // The red number counts every pending post, whatever the board filter says.
  const counts = review.pending.length;
  const shown = useMemo(
    () =>
      filterQueue(
        items.filter((i) => i.kind === "idea"),
        { board, status, sort },
      ),
    [items, board, status, sort],
  );
  const pending = review.pending.filter((row) => !board || row.boardId === board);
  const approved = review.approved.filter((row) => !board || row.boardId === board);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        label="Queue"
        tabs={[
          // A zero count shows no badge at all (#124).
          { id: "review", label: "To review", count: counts > 0 ? counts : undefined },
          { id: "ideas", label: "Ideas" },
        ]}
        selected={tab}
        onSelect={(id) => setTab(id as Tab)}
      />
      <div className="grid grid-cols-2 gap-3 @3xl:flex @3xl:flex-wrap">
        <div className="min-w-0 @3xl:w-56">
          <SelectField
            label="Board"
            value={board ?? ""}
            onChange={(e) => setBoard((e.target.value || undefined) as BoardCode | undefined)}
          >
            <option value="">All boards</option>
            {boards.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </SelectField>
        </div>
        {tab === "ideas" && (
          <div className="min-w-0 @3xl:w-56">
            <SelectField
              label="Status"
              value={status ?? ""}
              onChange={(e) => setStatus((e.target.value || undefined) as IdeaStatus | undefined)}
            >
              <option value="">All statuses</option>
              {IDEA_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        {/* Pending posts are always oldest first, so reviews stay on time. */}
        {tab === "ideas" && (
          <div className="min-w-0 @3xl:w-56">
            <SelectField label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as QueueSort)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </div>
      {/* The list and the cards switch by URL (?view=cards), so a shared link opens the same view (#139).
          The review tab is always the review list (#59), so the switch applies to the Ideas tab only. */}
      {tab === "ideas" && (
        <div className="flex justify-end">
          <ViewSwitch
            label="View"
            current={view}
            options={[
              { id: "list", label: "List", icon: List, href: "/queue" },
              { id: "cards", label: "Cards", icon: LayoutGrid, href: "/queue?view=cards" },
            ]}
            // Switch in place, so the tab and filters survive; keep the URL in step for sharing.
            onSelect={(id) => {
              const next = parseQueueView(id);
              setView(next);
              window.history.replaceState(null, "", next === "cards" ? "/queue?view=cards" : "/queue");
            }}
          />
        </div>
      )}
      {tab === "review" ? (
        <ReviewList pending={pending} approved={approved} />
      ) : shown.length === 0 ? (
        <p className="bordered bg-surface p-card">No ideas match these filters.</p>
      ) : view === "cards" ? (
        <div className="card-grid">
          {shown.map((item) => (
            <QueueCard key={`${item.kind}-${item.number}`} item={item} />
          ))}
        </div>
      ) : (
        // The rows sit in a white panel by default, as the old queue table did (#124).
        <div className={panel ? "overflow-hidden bordered bg-surface" : undefined}>
          {panel && <QueueHeader />}
          <ul className="flex flex-col divide-y divide-line">
            {shown.map((item) => (
              <QueueRow
                key={`${item.kind}-${item.number}`}
                item={item}
                style={rowStyle}
                highlight={highlight}
                titleUnderline={titleUnderline}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
